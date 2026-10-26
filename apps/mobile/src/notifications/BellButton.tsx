import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { notificationsHref, type PushTree } from '@/core/push/notification-route';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { bellBadge, bellLabel } from './notifications-cache';
import { useNotifications } from './use-notifications';

interface BellButtonProps {
  /** Which tree's notifications screen it opens. */
  tree: PushTree;
  /** A round button (the calm Today header's 44pt circle): the pressed wash takes the circle. */
  round?: boolean;
}

/**
 * The bell in a Today header (R-NOT-01): a 44pt button with the unread count («9+» above nine) at
 * its top corner. The spoken name carries the count; the drawn badge is hidden from it.
 */
export function BellButton({ tree, round = false }: BellButtonProps) {
  const { color } = useTheme();
  const unread = useNotifications().data?.unread ?? 0;
  const badge = bellBadge(unread);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={bellLabel(unread)}
      onPress={() => router.push(notificationsHref(tree))}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        borderRadius: round ? shape.control.touch / 2 : shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? color.lapisWash : 'transparent',
      })}
    >
      <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={color.ink} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </Svg>
      {badge ? (
        <View
          testID="bell-badge"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: 4,
            end: 2,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color.bad,
          }}
        >
          <AppText style={{ fontFamily: type.ui[700], fontSize: 11, lineHeight: 14, color: color.onBad, fontVariant: ['tabular-nums'] }}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
