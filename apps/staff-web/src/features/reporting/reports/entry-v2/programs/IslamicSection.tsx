import { ISLAMIC_DOMAINS, ISLAMIC_RATES, islamicContentSchema, type IslamicContent, type ReportContent } from '@ab/shared';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';
import { GradeChips } from '@/features/reporting/reports/entry-v2/GradeChips';
import type { ReportEntryV2State } from '@/features/reporting/reports/entry-v2/use-report-entry-v2';
import { CARD } from '@/features/reporting/reports/entry-v2/v2-classes';
import { TopicField } from './TopicField';

const islamicOf = (c: ReportContent): IslamicContent => c.islamic ?? islamicContentSchema.parse({});

/** Islamic studies: «المجال», the topic, what was memorized (optional) and the two graded rows. */
export function IslamicSection({ s }: { s: ReportEntryV2State }) {
  const v2 = t.reports.v2;
  const i = islamicOf(s.values.content);
  const change = (next: Partial<IslamicContent>) => s.setContent((c) => ({ ...c, islamic: { ...islamicOf(c), ...next } }));
  const domains = ISLAMIC_DOMAINS.map((d) => ({ value: d, label: v2.domains[d] }));
  return (
    <section aria-label={t.enums.program.islamic_studies} className={CARD}>
      <RadioChips
        name={`${s.report.id}-domain`}
        legend={v2.domainTitle}
        options={domains}
        value={i.domain}
        onChange={(domain) => change({ domain })}
        invalid={s.problem === 'missing_domain' && !i.domain}
        required
      />
      <TopicField label={v2.topic} value={i.topic} onChange={(topic) => change({ topic })} invalid={s.problem === 'missing_topic'} required />
      <TopicField label={`${v2.memorized} ${v2.optional}`} value={i.memorized} onChange={(memorized) => change({ memorized })} />
      {ISLAMIC_RATES.map((k) => (
        <GradeChips
          key={k}
          name={`${s.report.id}-rate-${k}`}
          label={v2.islamicRates[k]}
          value={i.rates[k]}
          onChange={(g) => change({ rates: { ...i.rates, [k]: g } })}
          invalid={s.problem === 'missing_grades'}
        />
      ))}
    </section>
  );
}
