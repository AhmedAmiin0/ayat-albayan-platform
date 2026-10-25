import type { MessageView } from '@ab/shared';
import { Modal } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { ForwardPicker } from './ForwardPicker';

export interface ForwardSheetProps {
  /** The message chosen for «إعادة توجيه»; null hides the sheet. */
  message: MessageView | null;
  /** The open chat: never offered as a target. */
  phone: string;
  onClose: () => void;
}

/**
 * «إعادة توجيه الرسالة», full height (as the template sheet). The picker mounts per message, so each
 * forward starts with no chat picked and an empty search.
 */
export function ForwardSheet({ message, phone, onClose }: ForwardSheetProps) {
  return (
    <Modal
      visible={message !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Screen sheet>
        <ScreenHeader
          size="h2"
          title={t.inbox.forward.title}
          trailing={<Button variant="ghost" label={t.inbox.forward.close} onPress={onClose} />}
        />
        {message ? <ForwardPicker message={message} from={phone} onDone={onClose} /> : null}
      </Screen>
    </Modal>
  );
}
