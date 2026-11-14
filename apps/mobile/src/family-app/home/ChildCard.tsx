import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { raisedCard } from '@/core/ui/surface/surface';
import { AppText } from '@/core/ui/primitives/AppText';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { pressScale } from '@/core/ui/primitives/Button';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { type, useTheme } from '@/theme';
import type { PortalChild } from './portal-me';

interface ChildCardProps {
  child: PortalChild;
  onOpen: (child: PortalChild) => void;
}

/**
 * One child on the guardian's home (docs/50 §6): name + student code; the whole card opens the
 * child's page, with the app's pressed state (wash + a slight press-in).
 */
export function ChildCard({ child, onOpen }: ChildCardProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${child.name} ${child.code}`}
      accessibilityHint={t.familyApp.home.open}
      onPress={() => onOpen(child)}
      style={({ pressed }) => ({
        ...raisedCard(color),
        backgroundColor: pressed ? color.lapisWash : color.raised,
        transform: [{ scale: pressScale(pressed, false) }],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
      })}
    >
      <Avatar name={child.name} id={child.id} decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={1} style={{ fontFamily: type.ui[600], color: color.ink }}>
          {child.name}
        </AppText>
        <Ltr style={{ fontSize: type.size.sm, color: color.ink2 }}>{child.code}</Ltr>
      </View>
      <Chevron to="next" color={color.ink2} />
    </Pressable>
  );
}
