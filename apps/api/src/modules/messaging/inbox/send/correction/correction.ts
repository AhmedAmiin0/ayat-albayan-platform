import {
  correctionBody,
  isCorrectable,
  mayCorrect,
  type ThreadText,
} from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { waHttpError } from '@/modules/messaging/whatsapp';
import type { CorrectionRepo, CorrectionTarget } from './correction.repo';

/** The send as the service needs it: its phone, input, author and base role. */
interface CorrectionSend {
  phone: string;
  input: ThreadText;
  actorId: string;
  /** The sender's base role: an admin corrects anyone's text. */
  role?: string | null;
}

/** The send after «تعديل»: the prefixed text replying to the original, and the row's link. */
interface Corrected<S extends CorrectionSend> {
  send: S;
  row: { corrects_id?: string };
}

/** The rule reads the row as a view would: a wamid = WhatsApp knows it (a reply can name it). */
const asCorrectable = (row: CorrectionTarget) => ({
  ...row,
  replyable: row.wa_message_id !== null,
  hidden: row.hidden_at,
  deleted: Boolean(row.deleted_at),
});

/** 400 correction_not_in_thread / not_correctable, 403 not_your_message; else the row. */
export function checkTarget(row: CorrectionTarget | null, s: CorrectionSend): CorrectionTarget {
  if (row?.phone_e164 !== s.phone) {
    throw waHttpError('correction_not_in_thread', HttpStatus.BAD_REQUEST);
  }
  if (!isCorrectable(asCorrectable(row))) {
    throw waHttpError('not_correctable', HttpStatus.BAD_REQUEST);
  }
  if (!mayCorrect(row.created_by, { id: s.actorId, role: s.role ?? null })) {
    throw waHttpError('not_your_message', HttpStatus.FORBIDDEN);
  }
  return row;
}

/**
 * What a correction replies to and links: the original. Correcting a correction targets the
 * message IT corrects, so the chain stays one level (one «صُحِّحت», one quote, one prefix).
 */
async function originalOf(
  repo: CorrectionRepo,
  picked: CorrectionTarget,
): Promise<CorrectionTarget> {
  if (!picked.corrects_id) return picked;
  const original = await repo.target(picked.corrects_id);
  if (original?.phone_e164 !== picked.phone_e164) {
    throw waHttpError('correction_not_in_thread', HttpStatus.BAD_REQUEST);
  }
  return original;
}

/**
 * «تعديل» in a WhatsApp chat (owner 2026-11-07): a send with correctsId becomes a NEW text,
 * «تصحيح: » (ar.json, admins may reword it) + the new text, sent as a reply to the original (its
 * wamid, the «رد» path), linked by corrects_id. The rights are checked on the picked message;
 * a picked correction links its original (originalOf), and a leading prefix in the text is dropped
 * (correctionBody). Every other send rule is the text's own.
 */
export async function correctionOf<S extends CorrectionSend>(
  repo: CorrectionRepo | undefined,
  s: S,
): Promise<Corrected<S>> {
  const id = s.input.correctsId;
  if (!id) return { send: s, row: {} };
  if (!repo) throw new Error('CorrectionRepo is not provided');
  const row = await originalOf(repo, checkTarget(await repo.target(id), s));
  const text = correctionBody(ar.inbox.correction.prefix, s.input.text);
  const input = { ...s.input, text, replyToMessageId: row.id };
  return { send: { ...s, input }, row: { corrects_id: row.id } };
}
