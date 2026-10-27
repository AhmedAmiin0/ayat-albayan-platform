import { I18nManager, View } from 'react-native';
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
 * «أرسل»: a paper plane pointing away from the box, toward the inline-end where the round button
 * sits; mirrored in Arabic (owner 2026-10-27: the bar follows the phone's direction, as WhatsApp).
 */
export function SendIcon({ color, size = 20 }: IconProps) {
  return (
    <View testID="send-icon" style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
      <Svg
        {...hidden}
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

/** One stroked path on the 24 grid; composer-icons draws its own with it. */
export function Line({ color, size = 22, d }: IconProps & { d: string }) {
  return (
    <Svg {...hidden} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/** «أرفق صورة أو ملف PDF»: a paperclip. */
export const AttachIcon = (p: IconProps) => (
  <Line {...p} d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 6.9" />
);
/** «الردود السريعة»: a speech bubble with a lightning bolt (a ready answer). */
export const SavedReplyIcon = (p: IconProps) => (
  <Line {...p} d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5ZM13 7.5l-3 4.5h4l-3 4.5" />
);
/** «عرض سعر»: a price tag. */
export const PriceIcon = (p: IconProps) => <Line {...p} d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9ZM7.5 7.5h.01" />;
/** «أزل»: a cross. */
export const CrossIcon = (p: IconProps) => <Line {...p} d="M6 6l12 12M18 6 6 18" />;
/** «عدّل»: a pencil. */
export const EditIcon = (p: IconProps) => <Line {...p} d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />;
/** «احذف»: a bin. */
export const TrashIcon = (p: IconProps) => <Line {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
/** «إلى الأعلى» / «إلى الأسفل»: a chevron up; flipped for down. */
export const UpIcon = (p: IconProps) => <Line {...p} d="m6 15 6-6 6 6" />;
export const DownIcon = (p: IconProps) => <Line {...p} d="m6 9 6 6 6-6" />;
/** «تشغيل»: a triangle pointing right in both directions (a media control, never mirrored). */
export const PlayIcon = (p: IconProps) => <Line {...p} d="M7 4.5v15l12-7.5-12-7.5Z" />;
/** «إيقاف مؤقت»: two bars. */
export const PauseIcon = (p: IconProps) => <Line {...p} d="M8 5v14M16 5v14" />;
/** «القوائم»: three bulleted lines (the chat's lists). */
export const ListsIcon = (p: IconProps) => <Line {...p} d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />;
/** «نسخ الرقم»: two overlapping sheets. */
export const CopyIcon = (p: IconProps) => <Line {...p} d="M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM16 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />;
/** «إلغاء الرد»: a cross. */
export const CloseIcon = (p: IconProps) => <Line {...p} d="M6 6l12 12M18 6 6 18" />;
/** A chat picked for «إعادة توجيه». */
export const CheckIcon = (p: IconProps) => <Line {...p} d="m5 12.5 4.5 4.5L19 7" />;
/** «رد», revealed behind a bubble as it is swiped: a curved arrow back, mirrored in RTL (as on the web). */
export const ReplyIcon = (p: IconProps) => (
  <View style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
    <Line {...p} d="M10 7 4 12l6 5M4 12h10a6 6 0 0 1 6 6" />
  </View>
);

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
