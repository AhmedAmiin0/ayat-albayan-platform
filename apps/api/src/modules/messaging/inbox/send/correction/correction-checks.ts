import { correctionBody, type ThreadText } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { ar, BUNDLES } from '@/common/infra/i18n/server-text';
import { waHttpError } from '@/modules/messaging/whatsapp';

/** What a correction send's checks read of a row: its body and link. */
interface CorrectionEcho {
  body: string | null;
  corrects_id?: string | null;
}

/** The prefixes the API may have put in front: the admins' live wording, then the bundled one. */
const prefixes = (): [string, string] => [
  ar.inbox.correction.prefix,
  BUNDLES.ar.inbox.correction.prefix,
];

/** What the family gets for `text` under each prefix the API may have used. */
const correctionBodies = (text: string): string[] => {
  const [live, bundled] = prefixes();
  return [correctionBody(live, text, [bundled]), correctionBody(bundled, text, [live])];
};

/**
 * A replayed first row IS this request (review of #694, round 4): it corrects the same original
 * with the same text under the live prefix or the bundled one. The server decides, so a client
 * with a stale or English wording never mistakes a retry after a lost answer for another send.
 */
export function sameRequest(row: CorrectionEcho, input: ThreadText): boolean {
  if (!input.correctsId || row.corrects_id !== input.correctsId) return false;
  const body = (row.body ?? '').trim();
  return correctionBodies(input.text).some((b) => b.trim() === body);
}

/** A replayed send carries the server's word on whether it is this request (a correction's). */
export function withSameRequest<S extends { view: CorrectionEcho; replayed: boolean }>(
  sent: S,
  input: ThreadText,
): S & { sameRequest?: boolean } {
  return sent.replayed ? { ...sent, sameRequest: sameRequest(sent.view, input) } : sent;
}

/** The reply fields the «رد» path resolved for a correction. */
interface ReplyContext {
  reply_to_wa_id?: string | null;
}

/**
 * 409 correction_other_number: the correction would leave from another line or number than its
 * original, so WhatsApp gets no reply context and the family would read a bare «تصحيح: …» in
 * another chat (review of #694, round 4).
 */
export function assertRepliesToOriginal(correctsId: string | undefined, reply: ReplyContext): void {
  const bare = Boolean(correctsId) && !reply.reply_to_wa_id;
  if (bare) throw waHttpError('correction_other_number', HttpStatus.CONFLICT);
}
