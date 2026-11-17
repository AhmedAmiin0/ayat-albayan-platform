import { I18nManager, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type ChatIconProps, hiddenIcon, IconLine } from './icon-line';

const mirrored = () => ({ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] });

/** «تشغيل»: a triangle pointing right in both directions (a media control, never mirrored). */
export const PlayIcon = (p: ChatIconProps) => <IconLine {...p} d="M7 4.5v15l12-7.5-12-7.5Z" />;
/** «إيقاف مؤقت»: two bars. */
export const PauseIcon = (p: ChatIconProps) => <IconLine {...p} d="M8 5v14M16 5v14" />;
/** «إلغاء»: a cross. */
export const CloseIcon = (p: ChatIconProps) => <IconLine {...p} d="M6 6l12 12M18 6 6 18" />;
/** «رد», revealed behind a bubble as it is swiped: a curved arrow back, mirrored in RTL. */
export const ReplyIcon = (p: ChatIconProps) => (
  <View style={mirrored()}>
    <IconLine {...p} d="M10 7 4 12l6 5M4 12h10a6 6 0 0 1 6 6" />
  </View>
);
/** «سجّل رسالة صوتية»: a microphone on its stand (never mirrored). */
export const MicIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"
  />
);

/**
 * «أرسل»: a paper plane pointing away from the box, toward the inline-end where the round button
 * sits; mirrored in Arabic (owner 2026-10-27: the bar follows the phone's direction, as WhatsApp).
 */
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
