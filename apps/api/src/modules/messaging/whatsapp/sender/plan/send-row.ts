import { quickReplyPayload, type TemplateButton, type TemplateParams } from '@ab/shared';
import { templateParams } from '@/modules/messaging/whatsapp/messages/wa-json';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { Sendable } from './send-row.types';

/**
 * Quick-reply payloads by button index: the producer's params.payloads[i], else
 * quickReplyPayload(intent, ref) with ref = lesson ?? lead ?? message id. URL buttons get ''.
 */
export function quickReplyPayloads(
  buttons: readonly TemplateButton[],
  input: { params: TemplateParams; ref: string },
): string[] {
  const own = (b: TemplateButton): string =>
    b.type === 'quick_reply' ? quickReplyPayload(b.intent, input.ref) : '';
  return buttons.map((b, i) => input.params.payloads?.[i] ?? own(b));
}

const hasDocument = (row: Sendable): boolean =>
  templateParams(row.template_params).document !== undefined;

/**
 * false = not yet: a document template whose PDF is not attached yet (the report job points the
 * queued row at it). Such a row is not claimed and no attempt is counted.
 */
export function readyToSend(row: Sendable, template: TemplateRow | null): boolean {
  if (!row.template_key) return true;
  if (!template) return false;
  return template.header_format !== 'document' || hasDocument(row);
}

const REPORT_PREFIX = 'report_ready:';

/** The lesson report a report_ready row delivers: its dedup key is `report_ready:{report id}`. */
export function reportIdOf(dedupKey: string | null): string | null {
  return dedupKey?.startsWith(REPORT_PREFIX) ? dedupKey.slice(REPORT_PREFIX.length) || null : null;
}
