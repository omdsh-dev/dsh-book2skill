/**
 * Context-merge imports: the host/client services this plugin consumes are
 * declared as Context merges by the real @deepseek-ai/* packages. Each
 * merge only enters the compilation when its package is imported somewhere,
 * so this file holds the type-only imports for every service the plugin
 * uses (the longbridge posture).
 */

import type {} from '@deepseek-ai/dsh-shell'
import type {} from '@deepseek-ai/dsh-storage-domain'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-web'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-host-directory-picker'
