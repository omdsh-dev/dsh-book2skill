/**
 * Book2Skill client half: one `conversation.view` tab hosting the 5-stage
 * timeline panel. The view is session-scoped (declared by ui-conversation);
 * data is global job state read from the host's /book2skill routes, so the
 * same jobs appear in every session and survive refreshes.
 * @module
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the SlotMap merge declaring `conversation.view` and the
// ctx.slots Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { Book2SkillPanel } from './Book2SkillPanel.tsx'

/** Required services: the slot registry (view tab host is ui-conversation). */
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const cordisCtx = ctx as unknown as Context
  // The slot declaration (ui-conversation) may activate later or replace
  // its declaration on HMR; slots.inject keeps the registration in sync.
  cordisCtx.slots.inject('conversation.view', () => cordisCtx.slots.register(
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
