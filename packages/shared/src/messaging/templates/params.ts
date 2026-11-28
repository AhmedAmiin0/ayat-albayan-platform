import { clockTime } from '@ab/time';
import { joinNames, lessonWhenText } from '../lesson/booking-confirmation';
import { quickReplyPayload } from '../replies/quick-reply';
import {
  lessonReminderTemplate,
  teacherReminderTemplate,
  type OutboundTemplate,
  type TemplateParams,
} from './templates';

// Typed params for Phase 4 producers (docs/12 §2, R-MSG-01).

export interface LessonMessageInput {
  /** The guardian's booked children in this lesson: {{1}}. */
  names: readonly string[];
  startsAt: Date;
  /** The recipient's tz (guardian or teacher): every time is wall-clock there (rule 6). */
  tz: string;
  meetingLink?: string | null;
}

function withButton(params: TemplateParams, button: string | null): TemplateParams {
  return button ? { ...params, button } : params;
}

/** lesson_reminder* (same day, R-MSG-02): {{1}} names, {{2}} «17:00», the link's button. */
export function lessonReminderMessage(input: LessonMessageInput): OutboundTemplate {
  const { key, button } = lessonReminderTemplate(input.meetingLink);
  const params = { '1': joinNames(input.names), '2': clockTime(input.startsAt, input.tz) };
  return { key, params: withButton(params, button) };
}

/**
 * lesson_reminder_24h (R-MSG-02, R-SCH-03): {{1}} names, {{2}} «17:00»; the two quick replies
 * carry «confirm:<lesson id>» and «reschedule:<lesson id>».
 */
export function lessonReminder24hMessage(
  input: LessonMessageInput & { lessonId: string },
): OutboundTemplate {
  return {
    key: 'lesson_reminder_24h',
    params: {
      '1': joinNames(input.names),
      '2': clockTime(input.startsAt, input.tz),
      payloads: [
        quickReplyPayload('confirm', input.lessonId),
        quickReplyPayload('reschedule', input.lessonId),
      ],
    },
  };
}

/**
 * The approved sample's wording before the link (WhatsApp text: Arabic whatever the UI language).
 */
const LINK_LABEL = 'رابط الحلقة:';

/**
 * Meta rejects a parameter with a newline, a tab or 4+ spaces in a row: one line, single spaces.
 */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The plain template has no button, so a non-Meet link rides in {{2}}. */
export function teacherReminderMessage(
  input: LessonMessageInput & { teacherName: string },
): OutboundTemplate {
  const { key, button } = teacherReminderTemplate(input.meetingLink);
  const link = oneLine(input.meetingLink ?? '');
  const slot = `${clockTime(input.startsAt, input.tz)} — ${joinNames(input.names)}`;
  const withLink =
    key === 'teacher_lesson_reminder' && link ? `${slot} · ${LINK_LABEL} ${link}` : slot;
  return { key, params: withButton({ '1': input.teacherName, '2': oneLine(withLink) }, button) };
}

export interface FollowUpInput {
  /** Two free starts from real teacher availability (R-LEAD-05). */
  slots: readonly [Date, Date];
  /** The lead's tz (qualification.tz ?? leads.tz ?? Asia/Riyadh). */
  tz: string;
  /** ar.json tz.<id> city name, {{3}} of the time-zone line. */
  tzCity: string;
  leadId: string;
}

/** {{3}} is the city; the stop button maps to stop:<lead>. */
export function followUpSlotsMessage(input: FollowUpInput): OutboundTemplate {
  const [a, b] = input.slots;
  return {
    key: 'follow_up_slots',
    params: {
      '1': lessonWhenText(a, input.tz),
      '2': lessonWhenText(b, input.tz),
      '3': input.tzCity,
      payloads: [quickReplyPayload('stop', input.leadId)],
    },
  };
}
