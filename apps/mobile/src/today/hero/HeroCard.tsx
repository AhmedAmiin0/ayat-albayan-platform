import { lessonStatusStyle } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/inbox/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { type, useTheme } from '@/theme';
import { riyadhTime, studentNames } from '../lib/lesson-text';
import type { Hero } from '../lib/today-plan';
import { HeroActions } from './HeroActions';
import { heroLead, heroSubtitle } from './hero-text';

export interface HeroCardProps {
  hero: Hero;
  busy: boolean;
  /** Why the last confirm was refused (the status already rolled back). */
  error?: string;
  onConfirm: () => void;
  onDetails: () => void;
}

/**
 * «الحلقة التالية» (docs/29 §3): the lesson under way, else the next one, on the lapis wash: the lead
 * and the status chip, the Riyadh time large beside the students, then «تأكيد الحلقة» / «ادخل الحلقة»
 * and «التفاصيل». The live classroom of the old «جلسات مباشرة» lives here and in the sheet.
 */
export function HeroCard({ hero, busy, error, onConfirm, onDetails }: HeroCardProps) {
  const { color } = useTheme();
  const { lesson } = hero;
  return (
    <View style={{ gap: 12, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, borderRadius: 24, backgroundColor: color.lapisWash }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.lapis }}>
          {heroLead(hero)}
        </AppText>
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <AppText
          style={{
            fontFamily: type.ui[700],
            fontSize: 34,
            lineHeight: 40,
            color: color.coverInk,
            fontVariant: ['tabular-nums'],
          }}
        >
          {riyadhTime(lesson.starts_at)}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText numberOfLines={2} style={{ fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: 28, color: color.ink }}>
            {studentNames(lesson)}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: 20, color: color.ink2, fontVariant: ['tabular-nums'] }}>
            {heroSubtitle(lesson)}
          </AppText>
        </View>
      </View>
      {error ? <ErrorLine message={error} /> : null}
      <HeroActions lesson={lesson} busy={busy} onConfirm={onConfirm} onDetails={onDetails} />
    </View>
  );
}
