import { tappedButton, type MessageView } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';

/** Theirs, from a tap on a template button: a small «ضغطة زرّ» mark over the tapped label (the body). */
export function TappedLabel({ message: m }: { message: MessageView }) {
  if (m.direction !== 'inbound' || !tappedButton(m.interactive_payload)) return null;
  return (
    <p className="mb-1 flex items-center gap-1 text-2xs font-semibold text-ink-3">
      <Icon name="reply" className="size-3.5" aria-hidden="true" />
      {t.inbox.templateBubble.tapped}
    </p>
  );
}
