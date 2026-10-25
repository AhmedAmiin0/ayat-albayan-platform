import { Image, Platform, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '../primitives/AppText';
import { TabBadge } from './TabBadge';
import { TAB_ICONS, type TabIconName } from './tab-icons';

export interface GlassTabProps {
  title: string;
  icon: TabIconName;
  badge?: string;
  focused: boolean;
  onPress: () => void;
}

/**
 * One tab of the capsule: 8 + 24 icon + 16 label line + 8 = 56. iOS reads it as a button inside the
 * tab bar container (UIKit's own tab bar does the same; RN maps role `tab` to no trait there), Android
 * as a tab. The label carries the unread count. Its text follows the system font size up to 1.3×
 * (Android sizes tab labels in sp; 24 + 16×1.3 fits the 56pt tab, and a lower cap than the height
 * allows spares the 64pt columns of a five-tab bar, past which one line ends in an ellipsis); on iOS
 * a long press also shows the large content viewer.
 */
export function GlassTab({ title, icon, badge, focused, onPress }: GlassTabProps) {
  const { name, color } = useTheme();
  const tint = focused ? color.lapis : name === 'dark' ? color.ink2 : color.ink3;
  const label = badge ? t.mobileNav.tabUnread.replace('{title}', title).replace('{n}', badge) : title;
  return (
    <Pressable
      accessibilityRole={Platform.OS === 'ios' ? 'button' : 'tab'}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View style={{ width: 24, height: 24 }}>
        <Image source={TAB_ICONS[icon]} style={{ width: 24, height: 24, tintColor: tint }} />
        {badge ? <TabBadge text={badge} onPill={focused} /> : null}
      </View>
      <AppText
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: focused ? type.ui[600] : type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: 16,
          letterSpacing: 0.11,
          color: tint,
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
