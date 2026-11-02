// WhatsApp actions that are not messages of their own (owner 2026-10-30): an edit, a revoke
// (deleted for everyone) or a reaction, from the WhatsApp Business app (smb_message_echoes,
// Kapso's history) or from the family. Each is kept as a hidden marker row (migration 992:
// message_is_reaction covers all three) that the database applies to the message it names
// (message_markers_apply), now or when that message arrives. Pure and lenient: Meta's and
// Kapso's shapes differ, so several paths are read.

import { z } from 'zod';
import { lenientText, parseOrNull } from '../payload/index.js';

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

export const isMarkerType = (type: string | null | undefined): type is MarkerType =>
  (MARKER_TYPES as readonly unknown[]).includes(type);

/** `{ text: { body } }` or a flat `{ text }`: Meta's edit and Kapso's differ. */
const bodyPart = z.looseObject({ body: lenientText }).catch({});
const textField = z
  .union([
    z.string().min(1).transform((flat) => ({ flat, body: undefined })),
    bodyPart.transform(({ body }) => ({ flat: undefined, body })),
  ])
  .catch({ flat: undefined, body: undefined });

const captionPart = z.looseObject({ caption: lenientText });

/** The edited message: its text, else its media's caption ({type: 'image', image: {caption}}). */
const editedMessage = z
  .looseObject({ type: lenientText, text: bodyPart })
  .catch({ text: {} })
  .transform((m) => ({
    body: m.text.body,
    caption: m.type === undefined ? undefined : parseOrNull(captionPart, m[m.type])?.caption,
  }));

/** The marker's own part (message[type]): the message it names, the edited text, the emoji. */
const markerPart = z
  .looseObject({
    original_message_id: lenientText,
    message_id: lenientText,
    id: lenientText,
    emoji: lenientText,
    body: lenientText,
    text: textField,
    message: editedMessage,
  })
  .catch({ text: textField.parse(undefined), message: editedMessage.parse(undefined) });

/** Edited text: Meta's {edit: {message: {text | <media>.caption}}}, or a flat shape. */
const editedText = (p: z.infer<typeof markerPart>): string | null =>
  p.message.body ?? p.text.body ?? p.body ?? p.text.flat ?? p.message.caption ?? null;

const markerMessage = z.looseObject({
  type: z.enum(MARKER_TYPES),
  context: z.looseObject({ id: lenientText }).catch({}),
});

/** The marker of a Meta message (echo, history item or inbound); null for an ordinary message. */
export function chatMarkerOf(message: unknown): ChatMarker | null {
  const m = parseOrNull(markerMessage, message);
  if (m === null) return null;
  const part = markerPart.parse(m[m.type]);
  return {
    type: m.type,
    target: part.original_message_id ?? part.message_id ?? part.id ?? m.context.id ?? null,
    text: m.type === 'edit' ? editedText(part) : null,
    emoji: m.type === 'reaction' ? (part.emoji ?? null) : null,
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
  z.looseObject({ type: z.enum(MARKER_TYPES) }).safeParse(payload).success;

const referral = z
  .looseObject({ welcome_message: z.looseObject({ text: lenientText }).catch({}) })
  .catch({ welcome_message: {} });

const welcomeSchema = z
  .looseObject({
    referral,
    kapso: z.looseObject({ referral }).catch({ referral: { welcome_message: {} } }),
    welcome: lenientText,
  })
  .transform(
    (m) =>
      m.referral.welcome_message.text ??
      m.kapso.referral.welcome_message.text ??
      m.welcome ??
      null,
  );

/**
 * The welcome text of a click-to-WhatsApp ad, when the payload carries it (Meta's
 * referral.welcome_message.text, at the top or inside Kapso's block); null otherwise.
 */
export const adWelcomeOf = (message: unknown): string | null =>
  parseOrNull(welcomeSchema, message);
