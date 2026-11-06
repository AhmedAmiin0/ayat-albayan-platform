import {
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

interface ButtonsProps {
  answers: readonly AppSendAnswer[];
  busy: boolean;
  /** Every answer records the manual send (sent-manually). */
  onAnswer: () => void;
}

function AnswerButtons({ answers, busy, onAnswer }: ButtonsProps) {
  return answers.map((a) => (
    <Button
      key={a}
      variant="secondary"
      label={t.messages.whatsappSend[APP_SEND_ANSWER_KEYS[a]]}
      busy={busy}
      onPress={onAnswer}
    />
  ));
}

interface Props {
  message: MessageView;
  phone: string;
  answers: readonly AppSendAnswer[];
}

/**
 * Staff's answer about a «أرسل عبر واتساب» (docs/19) in the bubble's line: «أرسلتها» while pending
 * and «نعم، أرسلتها» after an unconfirmed one record the manual send (sent-manually: the
 * platform stops for good). A row handed to WhatsApp is never put back to automatic sending.
 */
export function AppSendAnswers({ message: m, phone, answers }: Props) {
  const sent = useMessageAction(phone, 'sent-manually');
  return (
    <>
      <AnswerButtons answers={answers} busy={sent.isPending} onAnswer={() => sent.mutate(m.id)} />
      {sent.isError ? <ErrorLine message={t.common.error} /> : null}
    </>
  );
}

interface SheetProps {
  message: MessageView;
  /** FailedSheet closes and runs the answer from its own hooks (it stays mounted: errors show). */
  onAnswer: () => void;
}

/** In the «!» sheet: the answers of the row's state (none on the plain offer). */
export function SheetAnswers({ message, onAnswer }: SheetProps) {
  const now = useNow();
  const answers = APP_SEND_ANSWERS[appSendLineOf(message, now)];
  return <AnswerButtons answers={answers} busy={false} onAnswer={onAnswer} />;
}
