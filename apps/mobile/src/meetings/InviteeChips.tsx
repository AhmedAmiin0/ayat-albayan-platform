import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { DraftInvitee } from './invitee-draft';

/** The picked invitees as chips; tapping one («إزالة …») takes it off the list. */
export function InviteeChips({ list, onRemove }: { list: readonly DraftInvitee[]; onRemove: (key: string) => void }) {
  const { color } = useTheme();
  if (list.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {list.map((d) => (
        <Pressable
          key={d.key}
          accessibilityRole="button"
          accessibilityLabel={t.meetingInvites.removeInvitee.replace('{name}', d.label)}
          onPress={() => onRemove(d.key)}
          hitSlop={{ top: 4, bottom: 4 }}
          style={{
            minHeight: 36,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            borderRadius: shape.radius.pill,
            borderWidth: 1,
            borderColor: color.rule,
            backgroundColor: color.lapisWash,
          }}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{d.label}</AppText>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.lapis }}>×</AppText>
        </Pressable>
      ))}
    </View>
  );
}
