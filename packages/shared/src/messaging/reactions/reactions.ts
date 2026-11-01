import { z } from 'zod';
import type { MessageStatus } from '../../enums/index.js';
import type { MessageView } from '../chat/views.js';
import { isPayloadOfType, lenientText, parseOrNull, payloadOfType } from '../payload/index.js';

// WhatsApp message reactions (owner 2026-10-27: «hold a message to react»). WhatsApp is 1:1: one
// reaction from the contact (theirs) and one from the academy (ours) per message. Pure: the API,
// the
// web and the app share it.

/** The quick row above a held bubble, in WhatsApp's order. */
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
/** WhatsApp refuses a reaction to a message older than this. */
export const REACTION_MAX_AGE_DAYS = 30;
const MAX_AGE_MS = REACTION_MAX_AGE_DAYS * 86_400_000;

/** Past WhatsApp's 30 days (the API refuses it, the apps hide the row). */
export const reactionTooOld = (createdAt: string, now: Date): boolean =>
  now.getTime() - new Date(createdAt).getTime() > MAX_AGE_MS;
/**
 * One emoji (a ZWJ family or a flag included), never text; ≤ 32 UTF-16 units as the column allows.
 */
const EMOJI_RE = /^(?=.*[\p{Extended_Pictographic}\p{Regional_Indicator}])[^\s\p{L}]+$/u;

export const isReactionEmoji = (value: string): boolean =>
  value.length <= 32 && EMOJI_RE.test(value);

/**
 * PUT /threads/:phone/messages/:id/reaction: an emoji, or null to remove ours; the id makes a retry
 * one send.
 */
export const threadReactionSchema = z.object({
  emoji: z.string().refine(isReactionEmoji, { message: 'not_an_emoji' }).nullable(),
  clientRequestId: z.uuid(),
});
export type ThreadReaction = z.infer<typeof threadReactionSchema>;

/** A bubble's reactions; `ours_by` = the staff member who reacted (profiles.full_name). */
export interface MessageReactions {
  theirs: string | null;
  ours: string | null;
  ours_by: string | null;
}

/**
 * The PUT's answer: the reacted message as it is now, and how the send went (a failed one is
 * already reverted).
 */
export interface ReactionResult {
  message: MessageView;
  status: MessageStatus;
  error_code: string | null;
  error_text: string | null;
}

export const NO_REACTIONS: MessageReactions = { theirs: null, ours: null, ours_by: null };

/**
 * The reaction part of a Meta message ({type:'reaction', reaction:{message_id, emoji}}); emoji null
 * = removed.
 */
export interface ReactionRef {
  messageId: string;
  emoji: string | null;
}

/**
 * A stored row that is a reaction (inbound before reactions were columns, or our reaction send):
 * never a bubble.
 */
export const isReactionPayload = (payload: unknown): boolean =>
  isPayloadOfType(payload, 'reaction');

/** The target wamid and the emoji (empty = removed) of a reaction payload. */
const reactionRefSchema = payloadOfType('reaction')
  .extend({ reaction: z.looseObject({ message_id: z.string().min(1), emoji: lenientText }) })
  .transform(
    ({ reaction: r }): ReactionRef => ({ messageId: r.message_id, emoji: r.emoji ?? null }),
  );

/**
 * The target wamid and emoji of a reaction payload; null when it is not one or names no message.
 */
export const reactionRef = (payload: unknown): ReactionRef | null =>
  parseOrNull(reactionRefSchema, payload);

/** Tapping our current emoji removes it; any other replaces it. */
export const nextReaction = (current: string | null, tapped: string): string | null =>
  current === tapped ? null : tapped;

interface Reactable {
  /** WhatsApp knows the message (a wamid). */
  replyable?: boolean;
  created_at: string;
}

interface ReactableThread {
  /** The chat's send line can react (not the CRM line). */
  reactable?: boolean;
  session_open: boolean;
}

/**
 * Whether the bubble offers the reaction row: a WhatsApp message ≤ 30 days old in an open,
 * reactable chat.
 */
export function canReact(m: Reactable, thread: ReactableThread | null, now: Date): boolean {
  if (!thread?.reactable || !thread.session_open || m.replyable !== true) return false;
  return !reactionTooOld(m.created_at, now);
}
