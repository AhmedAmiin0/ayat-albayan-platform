import type { TemplateButtonKind } from '@ab/shared';
import { CopyIcon, Line, ReplyIcon } from '../../shared/chat-icons';

interface IconProps {
  color: string;
  size?: number;
}

// The leading icon of a template button, as WhatsApp draws them (owner 2026-10-28). Decorative: the
// row names itself. The reply arrow mirrors in RTL (chat-icons); the link and the phone never do.

/** A URL button: a box with an arrow leaving it. */
const LinkIcon = (p: IconProps) => (
  <Line {...p} d="M14 4h6v6M20 4l-8.5 8.5M17 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5.5" />
);
/** A call button: a handset. */
const PhoneIcon = (p: IconProps) => (
  <Line {...p} d="M6.5 4h2.6l1.6 4-2.1 1.4a11 11 0 0 0 6 6l1.4-2.1 4 1.6v2.6A2 2 0 0 1 18 19.5 15.5 15.5 0 0 1 4.5 6 2 2 0 0 1 6.5 4Z" />
);

const ICONS: Record<TemplateButtonKind, (p: IconProps) => React.JSX.Element> = {
  quick_reply: ReplyIcon,
  url: LinkIcon,
  phone_number: PhoneIcon,
  copy_code: CopyIcon,
};

export function ButtonIcon({ kind, color }: { kind: TemplateButtonKind; color: string }) {
  const Icon = ICONS[kind];
  return <Icon color={color} size={18} />;
}
