import { makeupOffer, type LessonView } from '@ab/schedule';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { usePublicConfig } from '@/core/lib/query/public-config';
import { makeupParams } from '@/booking/makeup/makeup-draft';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';

/** R-SCH-10: per still-charged student, not a trial or makeup, within 60 days; admin only. */
export function MakeupAction({ lesson, onLeave }: { lesson: LessonView; onLeave?: (() => void) | undefined }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const { makeup_window_days: days } = usePublicConfig();
  const { open, booked } = makeupOffer(lesson, new Date(), days);
  if (open.length + booked.length === 0) return null;
  const group = lesson.students.length > 1;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ gap: 8 }}>
        {open.map((student) => (
          <Button
            key={student.id}
            variant="secondary"
            label={t.booking.makeup.action}
            accessibilityLabel={`${t.booking.makeup.action} — ${student.name}`}
            onPress={() => {
              // From inside the lesson details sheet: close it first, or the wizard opens under it.
              onLeave?.();
              router.push({
                pathname: '/students/makeup/[lessonId]',
                params: makeupParams(lesson, student),
              });
            }}
          />
        ))}
      </View>
      {booked.map((s) => (
        <AppText
          key={s.id}
          style={{ fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 }}
        >
          {group ? `${s.name}: ` : ''}
          {t.booking.makeup.bookedChip.replace('{when}', whenIn(new Date(s.makeup.starts_at), tz, cycle))}
        </AppText>
      ))}
    </View>
  );
}
