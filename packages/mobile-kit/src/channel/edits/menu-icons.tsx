import { type ChatIconProps, IconLine } from '../../chat-ui/icons/icon-line';

// Row icons drawn with IconLine; reply uses the chat's ReplyIcon.

export const EditIcon = (p: ChatIconProps) => (
  <IconLine {...p} d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
);
export const TrashIcon = (p: ChatIconProps) => (
  <IconLine {...p} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
);
export const InfoIcon = (p: ChatIconProps) => (
  <IconLine {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01" />
);
