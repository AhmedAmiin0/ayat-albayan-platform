import type { ChannelAttachmentInput, ChannelFileKind, ChannelSenderRole } from '@ab/shared';
import { channelKindOf, channelMessageKindOf } from '@ab/shared';

// The columns a sent message adds to channel_messages (migration 20261117090300): its file and
// the snapshot of the message it answers.

export interface ChannelFileColumns {
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  attachment_name: string | null;
  attachment_duration_ms: number | null;
}

export interface ChannelQuoteColumns {
  quote_body: string | null;
  quote_kind: string | null;
  quote_sender_name: string | null;
  quote_sender_role: string | null;
}

/** A channel_messages row; the columns of 993 and 20261117090300 may be absent in fakes. */
export interface ChannelMessageRow
  extends Partial<ChannelFileColumns>, Partial<ChannelQuoteColumns> {
  id: string;
  body: string;
  sender_profile_id: string | null;
  sender_role: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  kind?: string;
  reply_to_id?: string | null;
  client_id?: string | null;
}

/** One insert; a key left out keeps the column's default (text, no file, no reply). */
export interface NewChannelMessage
  extends Partial<ChannelFileColumns>, Partial<ChannelQuoteColumns> {
  channel_id: string;
  sender_profile_id: string;
  sender_role: ChannelSenderRole;
  body: string;
  kind?: ChannelFileKind;
  reply_to_id?: string;
  client_id?: string;
}

/** A sender's send id in a channel: the key of a resend (channel_messages_client_idx). */
export interface ClientSend {
  channelId: string;
  profileId: string;
  clientId: string;
}

/** The file's columns and kind (a checked upload); nothing for a text message. */
export function fileColumns(
  file: ChannelAttachmentInput | undefined,
): Partial<ChannelFileColumns> & { kind?: ChannelFileKind } {
  if (!file) return {};
  return {
    kind: channelKindOf(file.mime),
    attachment_path: file.path,
    attachment_mime: file.mime,
    attachment_size: file.size,
    attachment_name: file.name,
    attachment_duration_ms: file.duration_ms ?? null,
  };
}

/** What a reply keeps of the message it answers, as it is now (deleting it later keeps this). */
export function quoteColumns(
  quoted: { id: string; body: string; kind?: string; sender_role: string },
  senderName: string,
): ChannelQuoteColumns & { reply_to_id: string } {
  return {
    reply_to_id: quoted.id,
    quote_body: quoted.body,
    quote_kind: channelMessageKindOf(quoted.kind),
    quote_sender_name: senderName,
    quote_sender_role: quoted.sender_role,
  };
}
