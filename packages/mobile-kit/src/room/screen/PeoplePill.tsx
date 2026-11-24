import { Pressable, View } from 'react-native';
import type { RoomTile } from '../model/room-types';
import { t } from '../../lib/i18n/i18n';
import { AppText, Avatar } from '../../ui';
import { shape, type, useTheme } from '../../theme';

interface PeoplePillProps {
  people: readonly RoomTile[];
  onPress: () => void;
}

export function PeoplePill({ people, onPress }: PeoplePillProps) {
  const { color } = useTheme();
  const n = people.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.mobileRoom.count.replace('{n}', String(n))}
      onPress={onPress}
      style={{
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.coverInk,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {people.slice(0, 3).map((p, i) => (
          <View key={p.key} style={{ marginStart: i === 0 ? 0 : -10 }}>
            <Avatar name={p.name} size="sm" decorative />
          </View>
        ))}
      </View>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.coverInk }}>
        {String(n)}
      </AppText>
    </Pressable>
  );
}
