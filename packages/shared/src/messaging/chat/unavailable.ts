import { z } from 'zod';
import { WA_ERROR } from '../../catalog/integrations/index.js';
import { isPayloadOfType, parseOrNull, payloadOfType } from '../payload/index.js';

/**
 * Meta's error on an inbound `unsupported` whose content it could not deliver: «This message is
 * unavailable».
 */
export const META_UNAVAILABLE = WA_ERROR.unavailable;

/**
 * Meta's `unsupported`: the message's content never reached the Cloud API (ask for it again). Not a
 * location, contact card or reaction: those did arrive, we only cannot show them («media.other»).
 */
export const isUnsupportedMessage = (payload: unknown): boolean =>
  isPayloadOfType(payload, 'unsupported');

const unavailableCode = z.unknown().refine((c) => Number(c) === META_UNAVAILABLE);

/** Meta's 131060 as the first of the payload's errors (the code a number or its digits). */
const unavailableSchema = payloadOfType('unsupported').extend({
  errors: z.tuple([z.looseObject({ code: unavailableCode })], z.unknown()),
});

/**
 * Whether an inbound row's stored payload (messages.interactive_payload, as the webhook keeps it:
 * `{ type: 'unsupported', errors: [{ code }], unsupported }`) is Meta's 131060: typically the first
 * message to a number in coexistence with the WhatsApp Business app. Its content never reaches the
 * Cloud API but shows in that app on the academy phone; the bubble says so and can ask for it
 * again.
 */
export const isUnavailableMessage = (payload: unknown): boolean =>
  unavailableSchema.safeParse(payload).success;

/** A reaction row's emoji: '' when it carries none (WhatsApp's removal). */
const reactionEmojiSchema = payloadOfType('reaction')
  .extend({ reaction: z.looseObject({ emoji: z.string().catch('') }).catch({ emoji: '' }) })
  .transform((p) => p.reaction.emoji);

/**
 * An inbound WhatsApp reaction kept as its own row (`{ type: 'reaction', reaction: { emoji,
 * message_id } }`):
 * «تفاعل: 👍» instead of «رسالة لا يمكن عرضها هنا» (owner 2026-10-27), «أُزيل التفاعل» when the
 * emoji is
 * empty (WhatsApp's removal); null for anything else. Until the reactions work shows it on the
 * bubble itself.
 */
export function reactionText(
  payload: unknown,
  words: { reacted: string; removed: string },
): string | null {
  const emoji = parseOrNull(reactionEmojiSchema, payload);
  if (emoji === null) return null;
  return emoji ? words.reacted.replace('{emoji}', emoji) : words.removed;
}
