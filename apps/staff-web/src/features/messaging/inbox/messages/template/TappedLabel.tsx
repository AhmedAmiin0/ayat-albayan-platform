import { tappedButton, type MessageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export function TappedLabel({ message: m }: { message: MessageView }) {
  if (m.direction !== 'inbound' || !tappedButton(m.interactive_payload)) return null;
  return (
    <p className="mb-1 flex items-center gap-1 text-2xs font-semibold text-ink-3">
      <Icon name="reply" className="size-3.5" aria-hidden="true" />
      {t.inbox.templateBubble.tapped}
    </p>
  );
}
