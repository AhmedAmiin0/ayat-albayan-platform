import type { WaLine } from '@ab/shared';
import type { DueMessage } from './sender.due';
import type { TemplateRow } from './whatsapp.types';

/**
 * The line a queued row leaves from (docs/12 §13.3, owner 2026-10-12): a template from its registry
 * line (a chat-WABA starter from chat; every producer template from notifications), a chat one from
 * notifications while the chat line is not configured (one line = one WABA); a session text from the
 * line it was stamped with at enqueue.
 */
export function lineOf(
  row: Pick<DueMessage, 'template_key' | 'line'>,
  template: Pick<TemplateRow, 'line'> | null,
  chatOn: boolean,
): WaLine {
  if (!row.template_key) return row.line ?? 'notifications';
  return template?.line === 'chat' && chatOn ? 'chat' : 'notifications';
}
