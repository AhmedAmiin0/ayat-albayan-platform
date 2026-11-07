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
];

/**
 * An outbound, sent staff text WhatsApp knows (a wamid): never a template, a file, a marker, a
 * hidden, deleted or failed message.
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

/** The text the family gets: the prefix (ar.json inbox.correction.prefix) then the new text. */
export const correctionBody = (prefix: string, text: string): string => `${prefix}${text.trim()}`;

/**
 * Original id → its newest correction's id, from the loaded messages (a correction is always newer
 * than what it corrects, so any loaded run that holds the original holds it too).
 */
export function correctionsOf(
  messages: ReadonlyArray<{ id: string; created_at: string } & CorrectionMark>,
): Map<string, string> {
  const sorted = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const map = new Map<string, string>();
  for (const m of sorted) if (m.corrects_id) map.set(m.corrects_id, m.id);
  return map;
}
