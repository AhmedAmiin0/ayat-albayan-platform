import type {
  ChannelMessageView,
  channelPostSchema,
  channelUploadSchema,
  ChannelPage,
  ChannelPresence,
  ChannelReads,
  SignedUpload,
  TeacherChannelRow,
} from '@ab/shared';
import type { z } from 'zod';

export interface ChannelPageAsk {
  studentId: string;
  /** The oldest message shown; none or empty reads the newest page. */
  before?: string | undefined;
}

export interface ChannelMessageAsk {
  studentId: string;
  messageId: string;
}

/** One audience's reads of a student chat, and its delete for everyone (docs/31 §2). */
export interface ChannelCalls {
  page: (ask: ChannelPageAsk) => Promise<ChannelPage>;
  presence: (studentId: string) => Promise<ChannelPresence>;
  reads: (ask: ChannelMessageAsk) => Promise<ChannelReads>;
  remove: (ask: ChannelMessageAsk) => Promise<ChannelMessageView>;
}

export interface TeacherChannelCalls extends ChannelCalls {
  list: () => Promise<TeacherChannelRow[]>;
}

export interface ChannelPostAsk {
  studentId: string;
  post: z.input<typeof channelPostSchema>;
}

export interface ChannelReadAsk {
  studentId: string;
  /** The newest message shown; the API reads up to now when absent. */
  at?: string | undefined;
}

export interface ChannelSlotAsk {
  studentId: string;
  file: z.input<typeof channelUploadSchema>;
}

export interface ChannelEditAsk extends ChannelMessageAsk {
  body: string;
}

/** A participant's writes in a student chat: send, read mark, file slot and edit. */
export interface ChannelWriteCalls {
  post: (ask: ChannelPostAsk) => Promise<ChannelMessageView>;
  read: (ask: ChannelReadAsk) => Promise<undefined>;
  upload: (ask: ChannelSlotAsk) => Promise<SignedUpload>;
  edit: (ask: ChannelEditAsk) => Promise<ChannelMessageView>;
}
