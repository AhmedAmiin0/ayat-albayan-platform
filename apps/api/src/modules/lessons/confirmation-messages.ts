import { bookingConfirmationTemplate, lessonWhenText } from '@ab/shared';
import type { QueuedMessage } from '../scheduling/change-set';

/** A booked student and their guardian (students → guardians). */
export type Contact = {
  id: string;
  name: string;
  guardian: { id: string; phone_e164: string; tz: string } | null;
};

export type ConfirmedLesson = { id: string; starts_at: string; meeting_link: string | null };

const names = new Intl.ListFormat('ar', { type: 'conjunction' });

/**
 * The lesson as its confirmation names it: with no link when its teacher holds it in our classroom
 * (`auto` = usesPlatform(teachers.meeting_mode, settings.meeting_link_auto); booking_confirmation_plain; the classroom link goes with the same-day reminder). The lesson row
 * itself keeps its link.
 */
export const forMessages = <L extends ConfirmedLesson>(lesson: L, auto: boolean): L => (auto ? { ...lesson, meeting_link: null } : lesson);

/**
 * One queued booking_confirmation* message per distinct guardian for a (re)booked lesson
 * (docs/10 §5.11, R-SCH-06, R-LES-02): template by the lesson's link host, {{1}} = that
 * guardian's students (Intl.ListFormat: «سارة ومريم»), {{2}} = start in the guardian's tz,
 * button = Meet code / Jitsi slug. dedup_key makes a retry queue nothing new (rule 8).
 * TODO(R-MSG-01): owner to confirm {{1}} is the student's name and that a reschedule reuses
 * the booking_confirmation templates.
 */
export function confirmationMessages(
  lesson: ConfirmedLesson,
  contacts: readonly Contact[],
): QueuedMessage[] {
  const template = bookingConfirmationTemplate(lesson.meeting_link);
  const byGuardian = new Map<string, { guardian: NonNullable<Contact['guardian']>; names: string[] }>();
  for (const c of contacts) {
    if (!c.guardian) continue;
    const entry = byGuardian.get(c.guardian.id) ?? { guardian: c.guardian, names: [] };
    entry.names.push(c.name);
    byGuardian.set(c.guardian.id, entry);
  }
  return [...byGuardian.values()].map(({ guardian, names: list }) => ({
    phone_e164: guardian.phone_e164,
    guardian_id: guardian.id,
    lesson_id: lesson.id,
    template_key: template.key,
    template_params: {
      '1': names.format(list),
      '2': lessonWhenText(new Date(lesson.starts_at), guardian.tz),
      ...(template.button ? { button: template.button } : {}),
    },
    dedup_key: `booking_confirmation:${lesson.id}:${guardian.id}`,
  }));
}
