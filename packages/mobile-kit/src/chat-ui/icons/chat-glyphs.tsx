import { I18nManager, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type ChatIconProps, hiddenIcon, IconLine } from './icon-line';

const mirrored = () => ({ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] });

/** Points right in both directions: a media control, never mirrored. */
export const PlayIcon = (p: ChatIconProps) => <IconLine {...p} d="M7 4.5v15l12-7.5-12-7.5Z" />;
export const PauseIcon = (p: ChatIconProps) => <IconLine {...p} d="M8 5v14M16 5v14" />;
export const CloseIcon = (p: ChatIconProps) => <IconLine {...p} d="M6 6l12 12M18 6 6 18" />;
/** Revealed behind a swiped bubble; mirrored in RTL. */
export const ReplyIcon = (p: ChatIconProps) => (
  <View style={mirrored()}>
    <IconLine {...p} d="M10 7 4 12l6 5M4 12h10a6 6 0 0 1 6 6" />
  </View>
);
/** Never mirrored. */
export const MicIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"
  />
);

/** Points toward the inline-end round button; mirrored in Arabic as the bar follows the phone. */
export function SendIcon({ color, size = 20 }: ChatIconProps) {
  return (
    <View testID="send-icon" style={mirrored()}>
      <Svg
        {...hiddenIcon}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M4 12 3 4l18 8-18 8 1-8Zm0 0h8" />
      </Svg>
    </View>
  );
}
