import { z } from 'zod';
import { parseOrNull } from '../payload/index.js';

// A family's tap on a template button (owner 2026-10-28): WhatsApp shows it as their message with
// the tapped label, quoting our template. The webhook keeps Meta's part as
// messages.interactive_payload: `{ type: 'button', button: { text, payload } }` (a template quick
// reply) or `{ type: 'interactive', interactive: { type: 'button_reply' | 'list_reply', …: { id,
// title } } }`.

const label = z.string().refine((s) => s.trim() !== '');
const titled = z.looseObject({ title: label });

const quickReply = z
  .looseObject({ type: z.literal('button'), button: z.looseObject({ text: label }) })
  .transform((p) => p.button.text);

const replyButton = z
  .looseObject({ type: z.literal('button_reply'), button_reply: titled })
  .transform((p) => p.button_reply.title);

const listRow = z
  .looseObject({ type: z.literal('list_reply'), list_reply: titled })
  .transform((p) => p.list_reply.title);

const interactiveReply = z
  .looseObject({ type: z.literal('interactive'), interactive: z.union([replyButton, listRow]) })
  .transform((p) => p.interactive);

/** The tapped label of a stored payload: a quick reply, a reply button or a list row. */
const tappedButtonSchema = z.union([quickReply, interactiveReply]);

/**
 * The label the family tapped (a quick reply, a reply button or a list row); null for anything
 * else.
 */
export const tappedButton = (payload: unknown): string | null =>
  parseOrNull(tappedButtonSchema, payload);
