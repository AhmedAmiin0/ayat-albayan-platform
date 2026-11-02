import { lessonStatusStyle } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { statusWord } from '@/core/ui/feedback/lesson-status';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { type, useTheme } from '@/theme';
import { lessonClock, studentNames } from '@/today/lib/lesson-text';
import type { Hero } from '@/today/lib/today-plan';
import { HeroActions } from './HeroActions';
import { heroLead, heroSubtitle } from './hero-text';

interface HeroCardProps {
  hero: Hero;
  busy?: boolean;
  /** Why the last confirm was refused (the status already rolled back). */
  error?: string;
  /** None: read-only (the salesperson's «اليوم»), see HeroActions. */
  onConfirm?: () => void;
  onDetails: () => void;
}

/**
 * «الحلقة التالية» (docs/29 §3): the lesson under way, else the next one, on the lapis wash: the lead
 * and the status chip, the local time large beside the students, then «تأكيد الحلقة» / «ادخل الحلقة»
 * and «التفاصيل» (no confirm when read-only). The live classroom of the old «جلسات مباشرة» lives here and in the sheet.
 */
export function HeroCard({ hero, busy = false, error, onConfirm, onDetails }: HeroCardProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { lesson } = hero;
  return (
    <View style={{ gap: 12, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, borderRadius: 24, backgroundColor: color.lapisWash }}>
      {/* The chip keeps its whole word (owner 2026-10-28: «Needs confirm…»): the lead wraps first. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.lapis }}>
          {heroLead(hero)}
        </AppText>
        <View style={{ flexShrink: 0, maxWidth: '60%' }}>
          <StatusChip {...lessonStatusStyle[lesson.status]} label={statusWord(lesson.status)} size="sm" />
        </View>
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
          {lessonClock(lesson.starts_at, tz, cycle)}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText numberOfLines={2} style={{ fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: 28, color: color.ink }}>
            {studentNames(lesson)}
          </AppText>
          <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: 20, color: color.ink2, fontVariant: ['tabular-nums'] }}>
            {heroSubtitle(lesson, cycle, tz)}
          </AppText>
        </View>
      </View>
      {error ? <ErrorLine message={error} /> : null}
      <HeroActions lesson={lesson} running={hero.kind === 'running'} busy={busy} onConfirm={onConfirm} onDetails={onDetails} />
    </View>
  );
}
