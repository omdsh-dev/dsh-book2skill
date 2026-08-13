#!/usr/bin/env python3
"""
parse_epub.py — 将 EPUB 文件拆分为按章节的 Markdown 文件

用法：
    python3 parse_epub.py <epub_path> <output_dir>

输出：
    <output_dir>/ch01-{标题}.md
    <output_dir>/ch02-{标题}.md
    ...
    <output_dir>/toc.md  （章节目录索引）
"""

import sys
import zipfile
import re
import os
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree as ET


# ─── HTML → 纯文本转换器 ────────────────────────────────────────────────────

class HtmlToMarkdown(HTMLParser):
    """将 HTML 转换为简洁 Markdown，保留标题层级和段落结构。"""

    BLOCK_TAGS = {'p', 'div', 'section', 'article', 'blockquote', 'li', 'dt', 'dd'}
    SKIP_TAGS  = {'script', 'style', 'head', 'nav', 'figure', 'figcaption', 'aside'}
    HEADING_MAP = {'h1': '#', 'h2': '##', 'h3': '###', 'h4': '####', 'h5': '#####', 'h6': '######'}

    def __init__(self):
        super().__init__()
        self.result = []
        self._skip_depth = 0
        self._current_heading = None
        self._buf = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if self._skip_depth > 0:
            self._skip_depth += 1
            return
        if tag in self.SKIP_TAGS:
            self._skip_depth = 1
            return
        if tag in self.HEADING_MAP:
            self._flush()
            self._current_heading = self.HEADING_MAP[tag]
        elif tag == 'br':
            self._buf.append('\n')
        elif tag in ('b', 'strong'):
            self._buf.append('**')
        elif tag in ('i', 'em'):
            self._buf.append('*')
        elif tag == 'li':
            self._flush()
            self._buf.append('- ')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag in self.HEADING_MAP:
            text = ''.join(self._buf).strip()
            self._buf = []
            if text:
                self.result.append(f'\n{self._current_heading} {text}\n')
            self._current_heading = None
        elif tag in self.BLOCK_TAGS:
            self._flush()
        elif tag in ('b', 'strong'):
            self._buf.append('**')
        elif tag in ('i', 'em'):
            self._buf.append('*')

    def handle_data(self, data):
        if self._skip_depth > 0:
            return
        # 标题文本也进入缓冲区：endtag 时需要完整拼接出 "## 标题" 行。
        # （修复：原实现把标题文本直接 append 到 result，导致 endtag 从
        # 空缓冲区取不到文字、所有标题行被丢弃，且 >5000 字的章节永远
        # 无法在 "## " 级别拆分。）
        self._buf.append(data)

    def _flush(self):
        text = ''.join(self._buf).strip()
        self._buf = []
        if text:
            self.result.append(f'\n{text}\n')

    def get_markdown(self):
        self._flush()
        md = ''.join(self.result)
        # 压缩多余空行（最多保留两个换行）
        md = re.sub(r'\n{3,}', '\n\n', md)
        return md.strip()


def html_to_markdown(html_content: str) -> str:
    parser = HtmlToMarkdown()
    parser.feed(html_content)
    return parser.get_markdown()


def extract_title_from_markdown(md: str) -> str:
    """从 Markdown 文本中提取标题：优先 # 标题，其次正文首行非空文本。"""
    for line in md.splitlines():
        line = line.strip()
        if line.startswith('#'):
            return re.sub(r'^#+\s*', '', line).strip()
    # fallback：取正文第一行非空文本（不超过 60 字）作为标题
    for line in md.splitlines():
        line = line.strip()
        if line and not line.startswith('-') and not line.startswith('*'):
            return line[:60]
    return ''


# ─── EPUB 解析核心 ──────────────────────────────────────────────────────────

def parse_epub(epub_path: str, output_dir: str):
    epub_path = Path(epub_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(epub_path, 'r') as zf:
        namelist = zf.namelist()

        # 1. 读 META-INF/container.xml → 找 OPF 路径
        container_xml = zf.read('META-INF/container.xml').decode('utf-8', errors='replace')
        root = ET.fromstring(container_xml)
        ns = {'cn': 'urn:oasis:names:tc:opendocument:xmlns:container'}
        opf_path = root.find('.//cn:rootfile', ns).get('full-path')
        opf_dir  = str(Path(opf_path).parent)
        opf_dir  = '' if opf_dir == '.' else opf_dir + '/'

        # 2. 读 OPF 文件 → 解析 manifest + spine
        opf_xml  = zf.read(opf_path).decode('utf-8', errors='replace')
        opf_root = ET.fromstring(opf_xml)

        # 处理 OPF 命名空间（可能是 2.0 或 3.0）
        opf_ns = re.match(r'\{([^}]+)\}', opf_root.tag)
        opf_ns = opf_ns.group(1) if opf_ns else 'http://www.idpf.org/2007/opf'
        ns_opf = {'opf': opf_ns}

        # 构建 id → href 映射（manifest）
        manifest = {}
        for item in opf_root.findall('.//opf:item', ns_opf):
            item_id   = item.get('id')
            item_href = item.get('href')
            media_type = item.get('media-type', '')
            if item_id and item_href:
                manifest[item_id] = {
                    'href': opf_dir + item_href,
                    'media-type': media_type,
                }

        # 读取 spine 顺序（idref 列表）
        spine_idrefs = []
        for itemref in opf_root.findall('.//opf:itemref', ns_opf):
            idref = itemref.get('idref')
            if idref and idref in manifest:
                spine_idrefs.append(idref)

        # 3. 按 spine 顺序解析每个 HTML 文件 → Markdown
        chapters = []  # [(md_content, suggested_title)]

        for idref in spine_idrefs:
            info = manifest[idref]
            if 'html' not in info['media-type'] and not info['href'].endswith(('.html', '.xhtml', '.htm')):
                continue
            try:
                html = zf.read(info['href']).decode('utf-8', errors='replace')
            except KeyError:
                # 有时 href 需要 URL 解码
                import urllib.parse
                decoded = urllib.parse.unquote(info['href'])
                try:
                    html = zf.read(decoded).decode('utf-8', errors='replace')
                except KeyError:
                    continue

            md = html_to_markdown(html)
            if not md.strip():
                continue
            title = extract_title_from_markdown(md) or Path(info['href']).stem
            chapters.append((md, title))

    # 4. 合并过短章节（< 200 字合并到前章）
    merged = []
    for md, title in chapters:
        char_count = len(md.replace(' ', '').replace('\n', ''))
        if merged and char_count < 200:
            prev_md, prev_title = merged[-1]
            merged[-1] = (prev_md + '\n\n' + md, prev_title)
        else:
            merged.append((md, title))

    # 5. 拆分过长章节（> 5000 字在 ## 级别分割）
    final_chapters = []
    for md, title in merged:
        char_count = len(md.replace(' ', '').replace('\n', ''))
        if char_count > 5000:
            # 在每个 ## 标题处切分
            parts = re.split(r'(?=\n## )', md)
            if len(parts) > 1:
                for i, part in enumerate(parts):
                    sub_title = extract_title_from_markdown(part) or f'{title}-{i+1}'
                    final_chapters.append((part.strip(), sub_title))
                continue
        final_chapters.append((md, title))

    # 6. 写出章节文件
    def safe_filename(s: str) -> str:
        s = re.sub(r'[\\/:*?"<>|]', '', s)
        s = s.strip().replace(' ', '-')
        return s[:60] or 'untitled'

    toc_lines = ['# 章节目录\n']
    for idx, (md, title) in enumerate(final_chapters, 1):
        num = f'{idx:02d}'
        fname = f'ch{num}-{safe_filename(title)}.md'
        fpath = output_dir / fname
        fpath.write_text(md, encoding='utf-8')
        toc_lines.append(f'{idx}. [{title}]({fname})')
        print(f'  写出: {fname}（{len(md)}字符）')

    # 写出目录索引
    toc_path = output_dir / 'toc.md'
    toc_path.write_text('\n'.join(toc_lines), encoding='utf-8')
    print(f'\n共 {len(final_chapters)} 章，目录已写出: {toc_path}')


# ─── 入口 ───────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    parse_epub(sys.argv[1], sys.argv[2])
