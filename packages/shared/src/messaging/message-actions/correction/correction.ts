// «تعديل» in a WhatsApp chat = a correction (owner 2026-11-07): WhatsApp's API cannot edit or
// revoke a sent message, so staff send a NEW reply to it, «تصحيح: …», linked by corrects_id. The
// original is never touched; the bubbles show the link (صُحِّحت on the original, the quote on the
// correction).

/** On a MessageView: the link of a correction. Both absent in an old cache. */
export interface CorrectionMark {
  /** This message corrects that one (same chat, ours). */
  corrects_id?: string | null;
  /** Staff who wrote it (messages.created_by): who may correct it. */
  sent_by_id?: string | null;
}

/** What the rule reads of a message: a MessageView, or a messages row of the API. */
export interface Correctable {
  direction: string;
  status: string;
  body: string | null;
  media_mime: string | null;
  template_key: string | null;
  interactive_payload: unknown;
  /** The view's flags (an API row passes its own). */
  replyable?: boolean;
  hidden?: unknown;
  deleted?: boolean;
  /** A correction itself: never corrected again (staff correct the original once more). */
  corrects_id?: string | null;
}

/** The signed-in staff member as the rule reads them. */
export interface CorrectionActor {
  id: string;
  role?: string | null;
}

const kindOk: ((m: Correctable) => boolean)[] = [
  (m) => m.direction === 'outbound',
  (m) => m.status !== 'failed',
  (m) => !m.template_key && !m.media_mime,
  (m) => m.interactive_payload === null || m.interactive_payload === undefined,
  (m) => Boolean(m.body?.trim()),
  (m) => m.replyable === true,
  (m) => !m.hidden && !m.deleted,
  (m) => !m.corrects_id,
];

/**
 * An outbound, sent staff text WhatsApp knows (a wamid): never a template, a file, a marker, a
 * hidden, deleted or failed message, nor a correction (review of #694: «تعديل» stays on the
 * original, and each new correction links to it).
 */
export const isCorrectable = (m: Correctable): boolean => kindOk.every((ok) => ok(m));

/** The one who sent it, or an admin. */
export const mayCorrect = (sentBy: string | null | undefined, who: CorrectionActor): boolean =>
  who.role === 'admin' || (Boolean(sentBy) && sentBy === who.id);

/** «تعديل» on this bubble for this viewer. */
export const canCorrect = (
  m: Correctable & CorrectionMark,
  who: CorrectionActor | null | undefined,
): boolean => !!who && isCorrectable(m) && mayCorrect(m.sent_by_id, who);

/** The prefix that starts `t` (any of `prefixes`, a blank one never does), or undefined. */
const leading = (prefixes: readonly string[], t: string): string | undefined =>
  prefixes.map((p) => p.trim()).find((p) => p !== '' && t.startsWith(p));

/**
 * The text without its leading prefix(es) (trimmed): a prefix staff typed themselves never
 * reaches the family twice («تصحيح: تصحيح: …»). `prefixes`: the admins' current wording and the
 * bundled one (ar.json inbox.correction.prefix).
 */
export function stripCorrectionPrefix(prefixes: readonly string[], text: string): string {
  const t = text.trim();
  const p = leading(prefixes, t);
  return p === undefined ? t : stripCorrectionPrefix(prefixes, t.slice(p.length));
}

/** The text the family gets: `prefix` once, then the text without any of `also` in front. */
export function correctionBody(prefix: string, text: string, also: readonly string[] = []): string {
  return `${prefix}${stripCorrectionPrefix([prefix, ...also], text)}`;
}

/** A correction that counts: not failed, hidden or deleted (it never greys its original). */
const counts = (m: CorrectionRow): boolean =>
  Boolean(m.corrects_id) && m.status !== 'failed' && !m.hidden && !m.deleted;

/** What correctionsOf reads of a loaded message. */
type CorrectionRow = { id: string; created_at: string; status?: string } & CorrectionMark &
  Pick<Correctable, 'hidden' | 'deleted'>;

/**
 * Original id → its newest correction's id, from the loaded messages (a correction is always newer
 * than what it corrects, so any loaded run that holds the original holds it too). A failed, hidden
 * or deleted correction never reached the family: its original is not marked.
 */
export function correctionsOf(
  messages: readonly CorrectionRow[],
): Map<string, string> {
  const sorted = messages.filter(counts).sort((a, b) => a.created_at.localeCompare(b.created_at));
  return new Map(sorted.map((m) => [m.corrects_id ?? '', m.id]));
}
