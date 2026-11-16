import {
  CHANNEL_SENDER_ROLES,
  channelMessageKindOf,
  type ChannelAttachmentView,
  type ChannelMessageView,
  type ChannelReplyView,
  type ChannelSenderRole,
} from '@ab/shared';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';

/** A stored role the shared list knows; a guardian otherwise (as before). */
export const roleOf = (r: string | null | undefined): ChannelSenderRole =>
  CHANNEL_SENDER_ROLES.find((x) => x === r) ?? 'guardian';

const kindOf = channelMessageKindOf;
const text = (v: string | null | undefined): string => v ?? '';
const orNull = <T>(v: T | null | undefined): T | null => v ?? null;
const has = (set: ReadonlySet<string> | undefined, id: string): boolean => set?.has(id) === true;

/** What one view needs beyond its row; every set is optional (none = nothing known). */
export interface ViewContext {
  me: string;
  names: ReadonlyMap<string, string>;
  /** Signed GET URLs by stored path (1 h). */
  urls?: ReadonlyMap<string, string>;
  /** My messages every other participant has read. */
  readByAll?: ReadonlySet<string>;
  /** Quoted messages deleted for everyone since. */
  goneQuotes?: ReadonlySet<string>;
}

const isDeleted = (row: ChannelMessageRow): boolean => Boolean(row.deleted_at);

/** A deleted message's file is never linked again. */
const linkOf = (row: ChannelMessageRow, ctx: ViewContext, path: string): string | null =>
  isDeleted(row) ? null : orNull(ctx.urls?.get(path));

function attachmentOf(row: ChannelMessageRow, ctx: ViewContext): ChannelAttachmentView | null {
  const path = row.attachment_path;
  if (!path) return null;
  return {
    mime: text(row.attachment_mime),
    size: orNull(row.attachment_size) ?? 0,
    name: text(row.attachment_name),
    duration_ms: orNull(row.attachment_duration_ms),
    url: linkOf(row, ctx, path),
  };
}

/** The snapshot taken at send time; the original deleted (or gone) → no text, deleted. */
function replyOf(row: ChannelMessageRow, ctx: ViewContext): ChannelReplyView | null {
  if (!row.quote_kind) return null;
  const id = text(row.reply_to_id);
  const gone = id === '' || has(ctx.goneQuotes, id);
  return {
    id,
    sender_name: text(row.quote_sender_name),
    sender_role: roleOf(row.quote_sender_role),
    body: gone ? '' : text(row.quote_body),
    kind: kindOf(row.quote_kind),
    deleted: gone,
  };
}

const nameOf = (ctx: ViewContext, sender: string | null): string =>
  sender ? text(ctx.names.get(sender)) : '';

/**
 * Whitelist: the text, its file and quote, who (role and name), mine or not, when, edited /
 * deleted, read by all (mine only). Never a profile id or a storage path.
 */
export function toMessageView(row: ChannelMessageRow, ctx: ViewContext): ChannelMessageView {
  const sender = row.sender_profile_id;
  const deleted = isDeleted(row);
  const mine = sender !== null && sender === ctx.me;
  return {
    id: row.id,
    body: deleted ? '' : row.body,
    sender_role: roleOf(row.sender_role),
    sender_name: nameOf(ctx, sender),
    mine,
    created_at: row.created_at,
    edited: !deleted && Boolean(row.edited_at),
    deleted,
    kind: kindOf(row.kind),
    attachment: attachmentOf(row, ctx),
    reply_to: replyOf(row, ctx),
    read_by_all: mine && has(ctx.readByAll, row.id),
    client_id: orNull(row.client_id),
  };
}
