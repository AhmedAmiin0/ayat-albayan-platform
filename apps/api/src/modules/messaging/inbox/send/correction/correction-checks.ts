import { correctionBody, stripCorrectionPrefix, type ThreadText } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { ar, BUNDLES } from '@/common/infra/i18n/server-text';
import { waHttpError } from '@/modules/messaging/whatsapp';

/**
 * What a correction send's checks read of the STORED row (never its rendered view: a hidden row
 * shows no body, review of #694 follow-up item 1): its body, link and own text.
 */
interface CorrectionEcho {
  body: string | null;
  corrects_id: string | null;
  /** The text staff typed, without any prefix (null: a correction sent before it was kept). */
  correction_text: string | null;
}

/** The prefixes the API may put in front now: the admins' live wording, then the bundled one. */
const prefixes = (): [string, string] => [
  ar.inbox.correction.prefix,
  BUNDLES.ar.inbox.correction.prefix,
];

/** The correction's own text: `text` without any prefix the API puts in front today. */
export const ownText = (text: string): string => stripCorrectionPrefix(prefixes(), text);

/** The prefix the row was really sent under: its body minus its own text ('' when unknown). */
const usedPrefix = (row: CorrectionEcho, own: string): string => {
  const body = row.body ?? '';
  return body.endsWith(own) ? body.slice(0, body.length - own.length) : '';
};

/**
 * The kept text compared exactly (items 2-3): the request's text without today's prefixes or the
 * one the row was sent under, so an admin's rewording never turns an exact retry into a new send,
 * while a shortened text under the pinned id is never taken as sent.
 */
const sameOwnText = (row: CorrectionEcho, own: string, text: string): boolean =>
  stripCorrectionPrefix([...prefixes(), usedPrefix(row, own)], text) === own;

/** A row sent before correction_text was kept: its body under the live or the bundled prefix. */
const sameBody = (row: CorrectionEcho, text: string): boolean => {
  const [live, bundled] = prefixes();
  const bodies = [correctionBody(live, text, [bundled]), correctionBody(bundled, text, [live])];
  return bodies.some((b) => b.trim() === (row.body ?? '').trim());
};

/**
 * A replayed first row IS this request (review of #694): it corrects the same original with the
 * same text. The server decides from the stored row, so neither a stale client wording, an
 * admin's rewording nor a «حذف من المنصة» since turns a retry after a lost answer into a new send.
 */
export function sameRequest(row: CorrectionEcho | undefined, input: ThreadText): boolean {
  if (!row || !input.correctsId || row.corrects_id !== input.correctsId) return false;
  return row.correction_text === null
    ? sameBody(row, input.text)
    : sameOwnText(row, row.correction_text, input.text);
}

/** A replayed send carries the server's word on whether it is this request (a correction's). */
export function withSameRequest<S extends { echo?: CorrectionEcho; replayed: boolean }>(
  sent: S,
  input: ThreadText,
): S & { sameRequest?: boolean } {
  return sent.replayed ? { ...sent, sameRequest: sameRequest(sent.echo, input) } : sent;
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
