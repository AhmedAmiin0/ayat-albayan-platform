import type { LessonRating, QuickReplyIntent } from '@ab/shared';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import type { Contact } from '@/modules/messaging/webhook/shared/webhook.types';

export interface InboundOptions {
  /** Epoch ms when Meta gets its 200 regardless (WebhookService); none = it waits for us. */
  deadline?: number;
  /**
   * A message the catch-up job back-filled (external/inbound, older than LATE_MS when stored): the
   * row, lead and quick reply as usual, its unread count included, but no admin / assistant push.
   * Its lead's follow-up cycle starts at `now` (the back-fill), never in the past.
   */
  quiet?: boolean;
  /** The catch-up run's time (a quiet message); defaults to the clock. */
  now?: Date;
}

export interface ReplyAction {
  intent: QuickReplyIntent | null;
  m: InboundEvent;
  lessonId: string | null;
  leadId: string | null;
}

export interface RateInput {
  m: InboundEvent;
  who: Contact;
  rating: LessonRating | null;
  lessonId: string | null;
}

export type ReplyInput = ReplyAction & RateInput;

export interface LessonAsk {
  m: InboundEvent;
  phone: string;
  who: Contact;
  rating: LessonRating | null;
  intent: QuickReplyIntent | null;
}

export interface RowInput {
  m: InboundEvent;
  phone: string;
  who: Contact;
  leadId: string | null;
  lessonId: string | null;
  /** One of the academy's own numbers (OwnNumbers): stored already read, never unread. */
  read?: boolean;
}

export interface LeadLink {
  id: string | null;
  /** The lead this message created (first message from an unknown number). */
  created: string | null;
  /** Follow-ups already sent; a reply starts the cadence over. */
  stage: number;
  /**
   * The lead's assistant (assigned_to, after auto-assign); null for a guardian, teacher or
   * applicant.
   */
  owner: string | null;
}

export interface Sender {
  who: Contact;
  lead: LeadLink;
}
