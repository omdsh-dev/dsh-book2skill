#!/usr/bin/env python3
"""
pdf_parse.py — PyPDF2 text extraction for dsh-book2skill.

用法：
    python3 pdf_parse.py probe <pdf>              → 打印前50页有效字符数（判断扫描型）
    python3 pdf_parse.py extract <pdf> <outdir>   → 按50页一块写出 pages_001-050.md ...

扫描型判定由调用方执行：probe 输出 < 5000 视为扫描型，转 OCR。
"""

import sys
import re
from pathlib import Path


def effective_chars(text: str) -> int:
    return len(re.sub(r'\s', '', text))


def probe(pdf_path: str) -> None:
    import PyPDF2
    reader = PyPDF2.PdfReader(pdf_path)
    total = len(reader.pages)
    text = ''
    for i in range(min(50, total)):
        try:
            text += reader.pages[i].extract_text() or ''
        except Exception:
            pass
    # 乱码判定：大量控制字符或替换字符
    garbled = text.count('\ufffd') + len(re.findall(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', text))
    print(f'total={total}')
    print(f'effective_chars={effective_chars(text)}')
    print(f'garbled={garbled}')


def extract(pdf_path: str, out_dir: str) -> None:
    import PyPDF2
    reader = PyPDF2.PdfReader(pdf_path)
    total = len(reader.pages)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    chunk = 50
    for start in range(0, total, chunk):
        end = min(start + chunk, total)
        text = ''
        for i in range(start, end):
            try:
                page_text = reader.pages[i].extract_text() or ''
            except Exception:
                page_text = ''
            text += f'\n--- Page {i + 1} ---\n' + page_text
        fname = f'pages_{start + 1:03d}-{end:03d}.md'
        (out / fname).write_text(text, encoding='utf-8')
        print(f'Written {fname} ({len(text)} chars)')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == 'probe':
        probe(sys.argv[2])
    elif cmd == 'extract':
        extract(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
        sys.exit(1)
