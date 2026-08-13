/**
 * Book2Skill client half: one `conversation.view` tab hosting the 5-stage
 * timeline panel. The view is session-scoped (declared by ui-conversation);
 * data is global job state read from the host's /book2skill routes, so the
 * same jobs appear in every session and survive refreshes.
 * @module
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: the slot registry (view tab host is ui-conversation). */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
