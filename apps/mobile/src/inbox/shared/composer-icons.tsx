import { Line } from './chat-icons';

interface IconProps {
  color: string;
  size?: number;
}

// The typing bar's own icons (owner 2026-10-27, as WhatsApp), drawn as chat-icons' Line. Never
// mirrored (a microphone, a camera and a face read the same both ways); hidden from screen readers.

/** «سجّل رسالة صوتية»: a microphone on its stand. */
export const MicIcon = (p: IconProps) => (
  <Line {...p} d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
);
/** «الكاميرا»: a camera body with its lens. */
export const CameraIcon = (p: IconProps) => (
  <Line {...p} d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
);
/** «الرموز التعبيرية»: a smiling face. */
export const EmojiIcon = (p: IconProps) => (
  <Line {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
);
/** «المعرض»: a picture with a mountain and the sun. */
export const GalleryIcon = (p: IconProps) => (
  <Line {...p} d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01" />
);
/** «مستند PDF»: a page with its corner folded. */
export const DocumentIcon = (p: IconProps) => <Line {...p} d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v4h4" />;
