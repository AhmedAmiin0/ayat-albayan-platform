import Svg, { Path } from 'react-native-svg';
import { type ChatIconProps as IconProps, hiddenIcon as hidden, IconLine as Line } from '@ab/mobile-kit';

// Line icons for the chat's icon buttons (the kit's IconLine: 24px grid, 1.75 stroke). Decorative:
// each IconButton names its action; the chat's shared glyphs (play, reply, send…) are the kit's.

export const SearchIcon = (p: IconProps) => <Line {...p} d="M16.5 10.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM15 15l5 5" />;

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

export const SavedReplyIcon = (p: IconProps) => (
  <Line {...p} d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5ZM13 7.5l-3 4.5h4l-3 4.5" />
);
export const PriceIcon = (p: IconProps) => <Line {...p} d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9ZM7.5 7.5h.01" />;
export const CrossIcon = (p: IconProps) => <Line {...p} d="M6 6l12 12M18 6 6 18" />;
export const EditIcon = (p: IconProps) => <Line {...p} d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />;
export const TrashIcon = (p: IconProps) => <Line {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />;
export const UpIcon = (p: IconProps) => <Line {...p} d="m6 15 6-6 6 6" />;
export const DownIcon = (p: IconProps) => <Line {...p} d="m6 9 6 6 6-6" />;
export const ComposeIcon = (p: IconProps) => (
  <Line {...p} d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5ZM12.5 8.5v6M9.5 11.5h6" />
);
export const CopyIcon = (p: IconProps) => <Line {...p} d="M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM16 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />;
export const MoreIcon = (p: IconProps) => <Line {...p} d="M12 5h.01M12 12h.01M12 19h.01" />;
export const CheckIcon = (p: IconProps) => <Line {...p} d="m5 12.5 4.5 4.5L19 7" />;
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
