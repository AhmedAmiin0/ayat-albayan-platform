import type { ChannelMessageKind } from './channel-media';
import type { ChannelClosedReason, ChannelSenderRole } from './channel';

// What the student channel's API answers (docs/31 §2). Views are whitelists: names only, never a
// phone, email or profile id. The apps parse them with channel.schemas.ts.

/**
 * A sender's role as the apps read it: an unknown role (a newer server's) is 'unknown', shown
 * with studentChannel.roles.unknown, never a wrong role.
 */
export type ChannelSenderLabel = ChannelSenderRole | 'unknown';

/** A message's file (kind photo, pdf or voice). */
export interface ChannelAttachmentView {
  mime: string;
  size: number;
  /** The file name the sender picked (a PDF's title). */
  name: string;
  /** A voice note's length; null for other files or when unknown. */
  duration_ms: number | null;
  /** A 1 h signed GET; null once the message is deleted for everyone. */
  url: string | null;
}

/**
 * The quoted message, as it was when the reply was sent (a snapshot); its original deleted for
 * everyone → body '' and deleted true.
 */
export interface ChannelReplyView {
  id: string;
  sender_name: string;
  sender_role: ChannelSenderLabel;
  body: string;
  kind: ChannelMessageKind;
  deleted: boolean;
}

export interface ChannelMessageView {
  id: string;
  /** Empty for a file without a caption, and once deleted. */
  body: string;
  sender_role: ChannelSenderLabel;
  /**
   * The teacher's display name, the student's, the guardian's or the assistant's name; empty once
   * the login is gone.
   */
  sender_name: string;
  /** Written by the caller. */
  mine: boolean;
  created_at: string;
  /** Changed by its sender after sending; only a text message is edited. */
  edited: boolean;
  /** Deleted for everyone: body empty, no file link. */
  deleted: boolean;
  kind: ChannelMessageKind;
  attachment: ChannelAttachmentView | null;
  reply_to: ChannelReplyView | null;
  /** Mine only: every other current participant has read up to it (✓✓); false for others'. */
  read_by_all: boolean;
  /** The sender app's id for this send (a resend with the same id returns the stored message). */
  client_id: string | null;
}

/** A thread page: oldest first within the page. */
export interface ChannelPage {
  /** Whose channel it is (the header names the student). */
  student_name: string;
  messages: ChannelMessageView[];
  has_more: boolean;
  /** A monitor's view: no composer, read only. */
  read_only: boolean;
  /**
   * Subscribed AND a teacher assigned (channelOpen). Closed: a participant gets
   * no messages and no composer, only the closed line of `closed_reason`; a monitor still reads.
   */
  open: boolean;
  closed_reason: ChannelClosedReason | null;
  /**
   * The Realtime filter (channel_messages.channel_id); RLS decides what the socket tells each
   * viewer.
   */
  channel_id: string;
  /** The chat's people now (the header line); the viewer flagged `me`. */
  participants: ChannelParticipantView[];
  /** The viewer's read mark (channel_reads); null for a monitor or before any read. */
  my_last_read_at: string | null;
}

/** One of the chat's current people: teacher(s), family logins (chat on), owning assistant(s). */
export interface ChannelParticipantView {
  name: string;
  role: ChannelSenderLabel;
  me: boolean;
}

/** GET …/messages/:messageId/reads: who of the chat (its sender aside) has read it, who not. */
export interface ChannelReads {
  read: { name: string; role: ChannelSenderLabel; at: string }[];
  unread: { name: string; role: ChannelSenderLabel }[];
}

/** GET /teachers/me/channels: one row per current student. */
export interface TeacherChannelRow {
  student_id: string;
  student_name: string;
  student_code: string;
  last_message: Pick<ChannelMessageView, 'body' | 'sender_role' | 'created_at' | 'deleted'> | null;
  /** Messages from the family (guardian, student) and the assistant after my last read. */
  unread: number;
}

/** The family's or the teacher's unread total (badges). */
export interface ChannelUnread {
  unread: number;
}
