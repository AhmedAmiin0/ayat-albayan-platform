import { clockTime } from '../running-head.js';
import { joinNames, lessonWhenText } from './booking-confirmation.js';
import { quickReplyPayload } from './quick-reply.js';
import {
  lessonReminderTemplate,
  teacherReminderTemplate,
  type OutboundTemplate,
  type TemplateParams,
} from './templates.js';

// Typed params for the Phase 4 producers (docs/12 §2). Producers that already exist keep their
// own builders: booking_confirmation* (booking.messages.ts, confirmation-messages.ts),
// report_ready (report-ready.ts), renewal_due (alerts.service.ts).
// TODO(R-MSG-01): {{2}} of the approved reminders is assumed to be the time; check against Meta.

export interface LessonMessageInput {
  /** The guardian's booked children in this lesson: {{1}} «سهيلة ومريم». */
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
export function lessonReminder24hMessage(input: LessonMessageInput & { lessonId: string }): OutboundTemplate {
  return {
    key: 'lesson_reminder_24h',
    params: {
      '1': joinNames(input.names),
      '2': clockTime(input.startsAt, input.tz),
      payloads: [quickReplyPayload('confirm', input.lessonId), quickReplyPayload('reschedule', input.lessonId)],
    },
  };
}

/** teacher_lesson_reminder*: {{1}} the teacher's name, {{2}} «17:00 — سهيلة ومريم» in their tz. */
export function teacherReminderMessage(input: LessonMessageInput & { teacherName: string }): OutboundTemplate {
  const { key, button } = teacherReminderTemplate(input.meetingLink);
  const slot = `${clockTime(input.startsAt, input.tz)} — ${joinNames(input.names)}`;
  return { key, params: withButton({ '1': input.teacherName, '2': slot }, button) };
}

export interface FollowUpInput {
  /** Two free starts from real teacher availability (R-LEAD-05). */
  slots: readonly [Date, Date];
  /** The lead's tz (qualification.tz ?? leads.tz ?? Asia/Riyadh). */
  tz: string;
  /** ar.json tz.<id>, e.g. «الرياض»: {{3}} in «المواعيد بتوقيت {{3}}». */
  tzCity: string;
  leadId: string;
}

/** follow_up_slots: {{1}} {{2}} «الأحد 4 أكتوبر 17:00», {{3}} the city; «وقف الرسايل» → stop:<lead>. */
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
