import { ARABIC_SKILLS, arabicContentSchema, type ArabicContent, type ReportContent } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { GradeChips } from '../GradeChips';
import type { ReportEntryV2State } from '../use-report-entry-v2';
import { CARD } from '../v2-classes';
import { TopicField } from './TopicField';

const arabicOf = (c: ReportContent): ArabicContent => c.arabic ?? arabicContentSchema.parse({});

/** Arabic program: «موضوع الدرس» and the four graded skills. */
export function ArabicSection({ s }: { s: ReportEntryV2State }) {
  const v2 = t.reports.v2;
  const a = arabicOf(s.values.content);
  const change = (next: Partial<ArabicContent>) => s.setContent((c) => ({ ...c, arabic: { ...arabicOf(c), ...next } }));
  return (
    <section aria-label={t.enums.program.arabic} className={CARD}>
      <TopicField label={v2.topic} value={a.topic} onChange={(topic) => change({ topic })} invalid={s.problem === 'missing_topic'} required />
      {ARABIC_SKILLS.map((k) => (
        <GradeChips
          key={k}
          name={`${s.report.id}-skill-${k}`}
          label={v2.skills[k]}
          value={a.skills[k]}
          onChange={(g) => change({ skills: { ...a.skills, [k]: g } })}
          invalid={s.problem === 'missing_grades'}
        />
      ))}
    </section>
  );
}
