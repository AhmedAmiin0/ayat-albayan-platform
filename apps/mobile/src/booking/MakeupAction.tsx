import { RIYADH_TZ, lessonWhenText, makeupOffer, type LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { usePublicConfig } from '@/lib/public-config';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { makeupParams } from './makeup-draft';

/**
 * «حجز تعويضي» under a missed lesson's row (R-SCH-10): for each student still charged for a
 * no_show / excused lesson (so a group lesson offers one per child), not a trial, not itself a
 * makeup, within 60 days (makeupOffer, shared with the web). It opens the makeup wizard for that
 * student and lesson; a student whose makeup is already booked sees «التعويض محجوز · <date>»
 * instead. Admin schedule only.
 */
export function MakeupAction({ lesson }: { lesson: LessonView }) {
  const { color } = useTheme();
  const { makeup_window_days: days } = usePublicConfig();
  const { open, booked } = makeupOffer(lesson, new Date(), days);
  if (open.length + booked.length === 0) return null;
  const group = lesson.students.length > 1;
  return (
    <View style={{ alignSelf: 'flex-start', gap: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {open.map((student) => (
          <Button
            key={student.id}
            variant="ghost"
            label={t.booking.makeup.action}
            accessibilityLabel={`${t.booking.makeup.action} — ${student.name}`}
            onPress={() =>
              router.push({
                pathname: '/students/makeup/[lessonId]',
                params: makeupParams(lesson, student),
              })
            }
          />
        ))}
      </View>
      {booked.map((s) => (
        <AppText
          key={s.id}
          style={{ fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 }}
        >
          {group ? `${s.name}: ` : ''}
          {t.booking.makeup.bookedChip.replace('{when}', lessonWhenText(new Date(s.makeup.starts_at), RIYADH_TZ, locale))}
        </AppText>
      ))}
    </View>
  );
}
