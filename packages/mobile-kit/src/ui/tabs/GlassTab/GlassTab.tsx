import { Image, Platform, Pressable, View } from 'react-native';
import { type } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import { TabBadge } from '../TabBadge';
import { TAB_ICONS } from '../tab-icons';
import { pressStyle } from './glass-tab.helpers';
import type { GlassTabProps } from './GlassTab.types';
import { useGlassTab } from './use-glass-tab';

/**
 * One tab of the capsule (54pt: a 24pt icon over an 11pt label, docs/29 §7). iOS reads it as a
 * button inside the tab bar container (UIKit's own tab bar does the same; RN maps role `tab` to
 * no trait there), Android as a tab. The label carries the unread count. Its text follows the
 * system font size up to 1.3×
 * (Android sizes tab labels in sp; 24 + 14×1.3 fits the 54pt tab, and a lower cap than the height
 * allows spares the ~68pt columns of a five-tab bar, past which one line ends in an ellipsis); on
 * iOS a long press also shows the large content viewer.
 */
export function GlassTab({ title, icon, badge, focused, onPress }: GlassTabProps) {
  const { tint, label } = useGlassTab({ title, badge, focused });
  return (
    <Pressable
      accessibilityRole={Platform.OS === 'ios' ? 'button' : 'tab'}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={title}
      onPress={onPress}
      style={pressStyle}
    >
      <View style={{ width: 24, height: 24 }}>
        <Image source={TAB_ICONS[icon]} style={{ width: 24, height: 24, tintColor: tint }} />
        {badge ? <TabBadge text={badge} /> : null}
      </View>
      <AppText
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: focused ? type.ui[600] : type.ui[500],
          fontSize: 11,
          lineHeight: 14,
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
