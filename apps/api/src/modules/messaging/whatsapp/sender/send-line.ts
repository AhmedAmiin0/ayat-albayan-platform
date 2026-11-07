import type { WaLine } from '@ab/shared';
import { lineEnvs, loadEnv } from '@/config/env/env';
import type { DueMessage } from './sender.due';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

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

/** The chat client is configured (read per call), as SenderRepo.chatConfigured. */
const chatConfigured = (): boolean => lineEnvs(loadEnv()).chat !== null;

/**
 * docs/42 42-7: a template's enqueue stamp (mirrors lineOf): a chat-line starter while the chat
 * line is configured is queued with `line: 'chat'`, so the chat lane sends it (in order with that
 * chat's texts); every other template stays unstamped (main lane). lineOf ignores it for routing.
 */
export function templateStamp(
  template: Pick<TemplateRow, 'line'>,
  chatOn = chatConfigured(),
): { line?: 'chat' } {
  return template.line === 'chat' && chatOn ? { line: 'chat' } : {};
}
