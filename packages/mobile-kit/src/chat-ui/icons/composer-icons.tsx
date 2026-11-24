import { type ChatIconProps, IconLine } from './icon-line';

// The typing bar's own icons (as WhatsApp), drawn with IconLine. Never mirrored
// (a microphone, a camera and a face read the same both ways); hidden from screen readers. The
// staff inbox and the student channel draw the same ones.

export const CameraIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
  />
);
export const EmojiIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"
  />
);
export const GalleryIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01"
  />
);
export const DocumentIcon = (p: ChatIconProps) => (
  <IconLine {...p} d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v4h4" />
);
export const AttachIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 6.9"
  />
);
/** The emoji panel's way back to typing. */
export const KeyboardIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7ZM7 10h.01M11 10h.01M15 10h.01M8 14h8"
  />
);
