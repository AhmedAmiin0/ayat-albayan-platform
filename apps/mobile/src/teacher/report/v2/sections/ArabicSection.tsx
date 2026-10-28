import { ARABIC_SKILLS } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ReportTextField } from '../../components/ReportTextField';
import { gradeSkill, withArabic } from '../hooks/content-edit';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';
import { GradePills } from '../ui/GradePills';

/** The Arabic lesson (attended): «موضوع الدرس», then the four skills, each graded. */
export function ArabicSection({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const arabic = s.values.content.arabic;
  return (
    <View style={{ gap: 14 }}>
      <Card>
        <ReportTextField
          label={v2.topic}
          value={arabic?.topic ?? ''}
          onChange={(topic) => s.edit((c) => withArabic(c, { topic }))}
          disabled={s.locked}
          invalid={s.problem === 'missing_topic'}
          maxLength={300}
        />
      </Card>
      {ARABIC_SKILLS.map((k) => (
        <Card key={k} title={v2.skills[k]}>
          <GradePills
            title={v2.skills[k]}
            value={arabic?.skills[k] ?? null}
            onChange={(grade) => s.edit((c) => gradeSkill(c, { skill: k, grade }))}
            disabled={s.locked}
          />
        </Card>
      ))}
    </View>
  );
}
