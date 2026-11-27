import type {
  ChannelMessageView,
  ChannelPage,
  ChannelPresence,
  ChannelReads,
  TeacherChannelRow,
} from '@ab/shared';

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
