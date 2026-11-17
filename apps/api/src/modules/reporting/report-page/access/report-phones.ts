import type { ReportAccessView, ReportCodeTarget } from '@ab/shared';
import type { PageFacts } from '@/modules/reporting/report-page/report-page.types';

/** Who the report is about, and whether it was sent to the family (lesson_reports.sent_at). */
interface PhoneSource {
  facts: PageFacts;
  sent: boolean;
}

/**
 * The report's teacher may still get a code: active, and still the lesson's teacher (as
 * TeacherLinkAccess checks the link's teacher). A teacher who left or was replaced: none (A3).
 */
const stillTeaches = ({ teacher, lesson }: PageFacts): boolean =>
  teacher.status === 'active' && lesson.teacher_id === teacher.id;

/**
 * The phone ON FILE of each code target: the lesson's teacher while stillTeaches; the student's
 * guardian only once the report was sent to them (as the portal and the signed-in page).
 */
const PHONES: Record<ReportCodeTarget, (s: PhoneSource) => string | null> = {
  teacher: (s) => (stillTeaches(s.facts) ? s.facts.teacher.phone_e164 : null),
  family: (s) => (s.sent ? (s.facts.student.guardian?.phone_e164 ?? null) : null),
};

/** «••••67»: the last two digits only, so the page never shows whose number it is. */
export const maskPhone = (phone: string): string => `••••${phone.slice(-2)}`;

export const phoneOf = (source: PhoneSource, to: ReportCodeTarget): string | null =>
  PHONES[to](source);

/** The targets with a phone, each number once (a teacher who is also the guardian: one choice). */
export function phoneChoices(source: PhoneSource): ReportAccessView['to'] {
  const seen = new Set<string>();
  const targets: ReportCodeTarget[] = ['family', 'teacher'];
  return targets.flatMap((to) => {
    const phone = phoneOf(source, to);
    if (!phone || seen.has(phone)) return [];
    seen.add(phone);
    return [{ to, masked: maskPhone(phone) }];
  });
}
