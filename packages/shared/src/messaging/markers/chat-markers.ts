// WhatsApp actions that are not messages of their own (owner 2026-10-30): an edit, a revoke
// (deleted for everyone) or a reaction, from the WhatsApp Business app (smb_message_echoes,
// Kapso's history) or from the family. Each is kept as a hidden marker row (migration 992:
// message_is_reaction covers all three) that the database applies to the message it names
// (message_markers_apply), now or when that message arrives. Pure and lenient: Meta's and
// Kapso's shapes differ, so several paths are read.

export const MARKER_TYPES = ['edit', 'revoke', 'reaction'] as const;
export type MarkerType = (typeof MARKER_TYPES)[number];

export interface ChatMarker {
  type: MarkerType;
  /** The wamid of the message it changes; null when the payload names none. */
  target: string | null;
  /** edit: the new text (or caption); null when the payload carries none. */
  text: string | null;
  /** reaction: the emoji; null = the reaction was removed. */
  emoji: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The value at a dotted path, else undefined. */
function at(value: unknown, path: string): unknown {
  let node = value;
  for (const key of path.split('.')) node = isRecord(node) ? node[key] : undefined;
  return node;
}

/** The first non-empty string among the paths. */
function text(value: unknown, ...paths: string[]): string | null {
  for (const p of paths) {
    const v = at(value, p);
    if (typeof v === 'string' && v !== '') return v;
  }
  return null;
}

export const isMarkerType = (type: unknown): type is MarkerType =>
  (MARKER_TYPES as readonly unknown[]).includes(type);

/** Edited text: Meta's {edit: {message: {text | <media>.caption}}}, or a flat shape. */
function editedText(part: unknown): string | null {
  const msg = at(part, 'message');
  const type = text(msg, 'type');
  const caption = type ? text(msg, `${type}.caption`) : null;
  return text(part, 'message.text.body', 'text.body', 'body', 'text') ?? caption;
}

/** The marker of a Meta message (echo, history item or inbound); null for an ordinary message. */
export function chatMarkerOf(message: unknown): ChatMarker | null {
  const type = text(message, 'type');
  if (!isMarkerType(type)) return null;
  const part = at(message, type);
  const target =
    text(part, 'original_message_id', 'message_id', 'id') ?? text(message, 'context.id');
  return {
    type,
    target,
    text: type === 'edit' ? editedText(part) : null,
    emoji: type === 'reaction' ? text(part, 'emoji') : null,
  };
}

/**
 * messages.interactive_payload of a marker row. A reaction keeps Meta's
 * {reaction: {message_id, emoji}} (reactionRef reads it); `marker: true` tells
 * message_markers_apply it is one to apply (our own reaction sends carry `target_id` and are
 * applied by the API instead).
 */
export function markerPayload(m: ChatMarker): Record<string, unknown> {
  const base = { type: m.type, marker: true, target: m.target };
  if (m.type === 'edit') return { ...base, text: m.text };
  if (m.type !== 'reaction') return base;
  return { ...base, reaction: { message_id: m.target, emoji: m.emoji ?? '' } };
}

/** A stored marker (or reaction) row: never a bubble, never unread, never the preview. */
export const isHiddenPayload = (payload: unknown): boolean =>
  isRecord(payload) && isMarkerType(payload.type);

/**
 * The welcome text of a click-to-WhatsApp ad, when the payload carries it (Meta's
 * referral.welcome_message.text, at the top or inside Kapso's block); null otherwise.
 */
export function adWelcomeOf(message: unknown): string | null {
  const paths = ['referral.welcome_message.text', 'kapso.referral.welcome_message.text', 'welcome'];
  return text(message, ...paths);
}
