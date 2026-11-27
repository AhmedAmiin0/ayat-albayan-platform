import { View } from 'react-native';
import { AppText, Chevron, IconButton, t, type, useTheme } from '@ab/mobile-kit';
import type { WeekNavProps } from './WeekNav.types';
import { LAST_WEEK, TITLE } from './week-nav.helpers';

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
