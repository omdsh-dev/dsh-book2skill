/**
 * Book2Skill client half: one `conversation.view` tab hosting the 5-stage
 * timeline panel. The view is session-scoped (declared by ui-conversation);
 * data is global job state read from the host's /book2skill routes, so the
 * same jobs appear in every session and survive refreshes.
 * @module
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotMap merge declaring `conversation.view` and the
// ctx.slots Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the renderer-owned ctx.slots service merge.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { Book2SkillPanel } from './Book2SkillPanel.tsx'

/** Required services: the slot registry (view tab host is ui-conversation). */
export const inject = ['slots']

export function apply(ctx: Context): void {
  // The slot declaration (ui-conversation) may activate later or replace
  // its declaration on HMR; slots.inject keeps the registration in sync.
  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    {
      name: 'conversation.view',
      id: 'book2skill',
      order: 1,
      label: () => '书籍转技能',
      inject: () => ({}),
    },
    Book2SkillPanel,
  ))
}
