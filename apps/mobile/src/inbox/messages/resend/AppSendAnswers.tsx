import {
  APP_SEND_ANSWER_ACTIONS,
  APP_SEND_ANSWER_KEYS,
  APP_SEND_ANSWERS,
  type AppSendAnswer,
  appSendLineOf,
} from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';

interface Props {
  message: MessageView;
  phone: string;
  answers: readonly AppSendAnswer[];
  /** Runs first (the «!» sheet closes); the bubble's line passes none. */
  before?: () => void;
  /** A failed answer in words, where the caller shows it (the sheet closes before the answer). */
  onError?: (text: string) => void;
}

/**
 * Staff's answer about a «أرسل عبر واتساب» (docs/19): «أرسلتها» while pending and «نعم» after an
 * unconfirmed one record the manual send (sent-manually: the platform stops for good); «لا، أعدها
 * للانتظار» is the retry, which holds a window-stopped text again (never sent as free text).
 */
export function AppSendAnswers({ message: m, phone, answers, before, onError }: Props) {
  const actions = {
    'sent-manually': useMessageAction(phone, 'sent-manually'),
    retry: useMessageAction(phone, 'retry'),
  };
  const all = Object.values(actions);
  const busy = all.some((a) => a.isPending);
  return (
    <>
      {answers.map((a) => (
        <Button
          key={a}
          variant="secondary"
          label={t.messages.whatsappSend[APP_SEND_ANSWER_KEYS[a]]}
          busy={busy}
          onPress={() => {
            before?.();
            const report = () => onError?.(t.common.error);
            actions[APP_SEND_ANSWER_ACTIONS[a]].mutate(m.id, { onError: report });
          }}
        />
      ))}
      {all.some((a) => a.isError) ? <ErrorLine message={t.common.error} /> : null}
    </>
  );
}

interface SheetProps {
  message: MessageView;
  phone: string;
  onClose: () => void;
  onError: (text: string) => void;
}

/** In the «!» sheet: the answers of the row's state (none on the plain offer); the sheet closes. */
export function SheetAnswers(p: SheetProps) {
  const now = useNow();
  const answers = APP_SEND_ANSWERS[appSendLineOf(p.message, now)];
  const { message, phone, onClose, onError } = p;
  return (
    <AppSendAnswers
      message={message}
      phone={phone}
      answers={answers}
      before={onClose}
      onError={onError}
    />
  );
}
