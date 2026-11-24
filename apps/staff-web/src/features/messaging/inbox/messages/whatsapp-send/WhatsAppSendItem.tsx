import type { MessageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useWhatsAppSend } from './use-whatsapp-send';

interface Props {
  message: MessageView;
  /** Closes the menu first (BubbleMenu's pick), then the action runs inside the same click. */
  pick: (run: () => void) => () => void;
  className: string;
}

export function WhatsAppSendItem({ message: m, pick, className }: Props) {
  const send = useWhatsAppSend();
  return (
    <button type="button" onClick={pick(() => send(m))} className={className}>
      <Icon name="chat" className="text-ink-3" />
      {t.messages.whatsappSend.action}
    </button>
  );
}
