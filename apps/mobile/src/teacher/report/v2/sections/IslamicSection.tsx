import { ISLAMIC_DOMAINS, ISLAMIC_RATES } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ReportTextField } from '../../components/ReportTextField';
import { gradeRate, withIslamic } from '../hooks/content-edit';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';
import { GradePills } from '../ui/GradePills';
import { Pills } from '../ui/Pills';

/** Islamic studies (attended): «المجال», «موضوع الدرس», «المحفوظ (اختياري)», then the two graded rows. */
export function IslamicSection({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const islamic = s.values.content.islamic;
  const domains = ISLAMIC_DOMAINS.map((d) => ({ value: d, label: v2.domains[d] }));
  return (
    <View style={{ gap: 14 }}>
      <Card title={v2.domainTitle}>
        <Pills
          label={v2.domainTitle}
          items={domains}
          isOn={(d) => d === islamic?.domain}
          onPress={(domain) => s.edit((c) => withIslamic(c, { domain }))}
          disabled={s.locked}
        />
        <ReportTextField
          label={v2.topic}
          value={islamic?.topic ?? ''}
          onChange={(topic) => s.edit((c) => withIslamic(c, { topic }))}
          disabled={s.locked}
          invalid={s.problem === 'missing_topic'}
          maxLength={300}
        />
        <ReportTextField
          label={`${v2.memorized} ${v2.optional}`}
          value={islamic?.memorized ?? ''}
          onChange={(memorized) => s.edit((c) => withIslamic(c, { memorized }))}
          disabled={s.locked}
          maxLength={300}
        />
      </Card>
      {ISLAMIC_RATES.map((k) => (
        <Card key={k} title={v2.islamicRates[k]}>
          <GradePills
            title={v2.islamicRates[k]}
            value={islamic?.rates[k] ?? null}
            onChange={(grade) => s.edit((c) => gradeRate(c, { rate: k, grade }))}
            disabled={s.locked}
          />
        </Card>
      ))}
    </View>
  );
}
