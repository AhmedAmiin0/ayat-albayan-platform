import { wallParts } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import { dayLine } from './picks';
import { useViewerClock } from '@/core/lib/clock';

interface PicksListProps {
  picks: readonly string[];
  /** The family's zone: each day's weekday and time. */
  tz: string;
  /** Unpicks one day; without it the list is read-only (the review). */
  onRemove?: (pick: string) => void;
}

const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «أيام الحلقات»: one row per picked day with its time («الأحد الساعة 18:00»), earliest first. */
export function PicksList({ picks, tz, onRemove }: PicksListProps) {
  const viewer = useViewerClock();
  const { color } = useTheme();
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.booking.courseDays}</SectionLabel>
      {picks.length === 0 ? (
        <AppText style={{ ...text, fontSize: type.size.sm, color: color.ink2 }}>{t.booking.noDayPicked}</AppText>
      ) : null}
      {picks.map((pick) => (
        <View key={pick} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <AppText style={{ ...text, flex: 1 }}>{dayLine(pick, tz, viewer)}</AppText>
          {onRemove ? (
            <View testID="pick-remove" style={{ flex: 1 }}>
              <Button
                variant="danger"
                label={t.booking.removeDay.replace('{day}', weekdays[String(wallParts(pick, tz).weekday)] ?? '')}
                onPress={() => onRemove(pick)}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
