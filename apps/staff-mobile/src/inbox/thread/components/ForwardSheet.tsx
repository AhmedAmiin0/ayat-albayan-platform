import type { MessageView } from '@ab/shared';
import { Modal } from 'react-native';
import { t, Button, Screen, ScreenHeader } from '@ab/mobile-kit';
import { ForwardPicker } from './ForwardPicker';

interface ForwardSheetProps {
  /** Null hides the sheet. */
  message: MessageView | null;
  /** The open chat: never offered as a target. */
  phone: string;
  onClose: () => void;
}

/** The picker mounts per message so each forward starts clean. */
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
