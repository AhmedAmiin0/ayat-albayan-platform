import type { ReportAccessView, ReportCodeTarget } from '@ab/shared';
import type { PageFacts } from '@/modules/reporting/report-page/report-page.types';

/** The phone ON FILE of each code target: the lesson's teacher, the student's guardian. */
const PHONES: Record<ReportCodeTarget, (f: PageFacts) => string | null> = {
  teacher: (f) => f.teacher.phone_e164,
  family: (f) => f.student.guardian?.phone_e164 ?? null,
};

/** «••••67»: the last two digits only, so the page never shows whose number it is. */
export const maskPhone = (phone: string): string => `••••${phone.slice(-2)}`;

export const phoneOf = (facts: PageFacts, to: ReportCodeTarget): string | null => PHONES[to](facts);

/** The targets with a phone, each number once (a teacher who is also the guardian: one choice). */
export function phoneChoices(facts: PageFacts): ReportAccessView['to'] {
  const seen = new Set<string>();
  const targets: ReportCodeTarget[] = ['family', 'teacher'];
  return targets.flatMap((to) => {
    const phone = phoneOf(facts, to);
    if (!phone || seen.has(phone)) return [];
    seen.add(phone);
    return [{ to, masked: maskPhone(phone) }];
  });
}
