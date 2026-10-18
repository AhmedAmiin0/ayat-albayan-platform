import { I18nManager } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

// Line icons for the chat's icon buttons (24px grid, 1.75 stroke, as the tab icons). Decorative:
// each IconButton names its action. Hidden from screen readers here as Chevron is.
const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** «أرسل قالبًا»: a sheet with lines (an approved message to fill in). */
export function TemplateIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      {...hidden}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <Path d="M14 3v4h4M9 12h6M9 16h4" />
    </Svg>
  );
}

/**
 * «أرسل»: a paper plane pointing the way the line is read, to the inline-end (left in Arabic, as
 * WhatsApp draws it). The path points right; it is flipped in RTL.
 */
export function SendIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg
      {...hidden}
      testID="send-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
    >
      <Path d="M4 12 3 4l18 8-18 8 1-8Zm0 0h8" />
    </Svg>
  );
}

/** «تحقق من التسجيل»: a person with a check mark (is this number already a student?). */
export function CheckPersonIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      {...hidden}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <Path d="M3 21v-1a6 6 0 0 1 9.5-4.9" />
      <Path d="m15 19 2 2 4-4.5" />
    </Svg>
  );
}
