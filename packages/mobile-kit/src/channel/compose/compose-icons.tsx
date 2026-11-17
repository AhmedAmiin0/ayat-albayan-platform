import { IconLine, type ChatIconProps } from '../../chat-ui/icons/icon-line';

/** «الرموز التعبيرية»: a smiling face (ChatX boards). */
export const EmojiIcon = (p: ChatIconProps) => (
  <IconLine {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
);

/** «إرفاق ملف»: a paper clip. */
export const ClipIcon = (p: ChatIconProps) => (
  <IconLine
    {...p}
    d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 6.9"
  />
);
