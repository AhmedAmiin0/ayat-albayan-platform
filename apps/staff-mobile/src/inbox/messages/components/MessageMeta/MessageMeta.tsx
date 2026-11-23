import { canSendViaWhatsApp, type MessageView } from '@ab/shared';
import type { ClockCycle } from '@ab/time';
import { Pressable } from 'react-native';
import { t, type, AppText, BubbleMeta, useSmallText } from '@ab/mobile-kit';
import { lineWord } from '@/inbox/shared/line-words';
import { clock, deliveryTimes, errorLine, queuedLine } from '@/inbox/messages/hooks/message-text';
import { senderText } from '@/inbox/thread/hooks/thread-mode';
import { useClockCycle } from '@/core/lib/clock';
import { WhatsAppStatusLine } from '@/inbox/messages/resend/WhatsAppSendLine';
import { CorrectedMark } from '@/inbox/messages/components/correction/CorrectedMark';

/** Time only, the day is in the separator; a long press on the ticks lists their times. */
const timeOf = (m: MessageView, cycle: ClockCycle): string =>
  m.edited ? `${t.inbox.edited} · ${clock(m.created_at, cycle)}` : clock(m.created_at, cycle);

/** A held text offers send via WhatsApp; any other queued row the wa.me hand-off. */
const queuedAction = (m: MessageView): string =>
  canSendViaWhatsApp(m) ? t.messages.whatsappSend.action : t.messages.clickToChat;

/** What the ticks say and do: ours only; the admin's stuck row is a button (FailedSheet). */
function ticksOf(m: MessageView, cycle: ClockCycle, onTicksPress?: () => void) {
  if (m.direction !== 'outbound') return undefined;
  const action = m.status === 'failed' ? errorLine(m) : queuedAction(m);
  const times = deliveryTimes(m, { cycle });
  return {
    status: m.status,
    errorCode: m.error_code,
    times,
    onPress: onTicksPress,
    actionLabel: onTicksPress ? action : undefined,
  };
}

export function MessageMeta({
  message: m,
  onTicksPress,
}: {
  message: MessageView;
  onTicksPress?: () => void;
}) {
  const cycle = useClockCycle();
  const small = useSmallText();
  const later = queuedLine(m, { cycle });
  const sender = senderText(m);
  return (
    <>
      {sender ? <AppText style={small}>{sender}</AppText> : null}
      {/*
        As WhatsApp: at the bubble's inline-end, the ticks right after the time (the web's order).
      */}
      <BubbleMeta
        time={timeOf(m, cycle)}
        ticks={ticksOf(m, cycle, onTicksPress)}
        lead={m.line ? lineWord(m.line) : null}
        mark={<CorrectedMark />}
      />
      {later ? <AppText style={small}>{later}</AppText> : null}
      {/* A failed row's send-via-WhatsApp comes after its reason. */}
      {m.status === 'failed' ? null : <WhatsAppStatusLine message={m} phone={m.phone_e164} />}
    </>
  );
}

/** Everyone sees the reason; the admin's is a button to the failed sheet, cut to two lines. */
export function FailReason({
  message: m,
  onPress,
}: {
  message: MessageView;
  onPress?: () => void;
}) {
  const small = useSmallText();
  const text = (
    <AppText
      numberOfLines={onPress ? 2 : undefined}
      style={{ ...small, fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) }}
    >
      {errorLine(m)}
    </AppText>
  );
  const reason = onPress ? (
    <Pressable accessibilityRole="button" hitSlop={{ top: 8, bottom: 8 }} onPress={onPress}>
      {text}
    </Pressable>
  ) : (
    text
  );
  return (
    <>
      {reason}
      <WhatsAppStatusLine message={m} phone={m.phone_e164} />
    </>
  );
}
