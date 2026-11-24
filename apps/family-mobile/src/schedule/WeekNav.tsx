import { View } from 'react-native';
import { AppText, Chevron, IconButton, t, type, useTheme } from '@ab/mobile-kit';

/** The weeks the API covers (the next 14 days reach into the third week). */
const LAST_WEEK = 2;

const TITLE: readonly (() => string)[] = [
  () => t.portal.app.schedule.thisWeek,
  () => t.portal.app.schedule.nextWeek,
  () => t.portal.app.schedule.laterWeek,
];

interface WeekNavProps {
  offset: number;
  range: string;
  onChange: (offset: number) => void;
}

export function WeekNav({ offset, range, onChange }: WeekNavProps) {
  const { color } = useTheme();
  const S = t.portal.app.schedule;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconButton label={S.prev} disabled={offset <= 0} onPress={() => onChange(offset - 1)}>
        <Chevron to="prev" color={color.ink} />
      </IconButton>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <AppText style={{ fontFamily: type.ui[700], color: color.ink }}>
          {TITLE[offset]?.() ?? ''}
        </AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{range}</AppText>
      </View>
      <IconButton
        label={S.next}
        disabled={offset >= LAST_WEEK}
        onPress={() => onChange(offset + 1)}
      >
        <Chevron to="next" color={color.ink} />
      </IconButton>
    </View>
  );
}
