import type { CallView, MessageView } from '@ab/shared';
import { memo } from 'react';
import { View } from 'react-native';
import { CallEntry } from '@/inbox/thread/calls/entries/CallEntry';
import { DayChip } from '@/inbox/messages/days/DayChip';
import { MessageBubble } from '@/inbox/messages/components/MessageBubble';
import { Corrected } from '@/inbox/messages/components/correction/Corrected';

interface MessageRowProps {
  id: string;
  message?: MessageView;
  call?: CallView;
  /** Space over it (messageGap with its older neighbour). */
  gap: number;
  /** The day chip that opens its day, or null. */
  day: string | null;
  phone: string;
  /** Stable: a tap on its quote. */
  onJump: (id: string) => void;
  highlight: boolean;
  /** «تعديل» (owner 2026-11-07): its newest correction's id; the bubble greys and links to it. */
  correctedBy?: string | undefined;
  /** Stable while calls back are possible; undefined hides «اتصال». */
  onCallBack: ((call: CallView) => void) | undefined;
}

/**
 * One cell of the thread. Memo on primitives and the cached message / call objects (TanStack keeps an
 * unchanged message the same object), so a new message, a tick or a jump redraws only the rows it changes.
 * Each cell is flipped back upright by the inverted list, so its top is the visual top: the older neighbour.
 */
export const MessageRow = memo(function MessageRow(props: MessageRowProps) {
  const { id, message, call, gap, day, phone, onJump, highlight, onCallBack, correctedBy } = props;
  return (
    <View testID={`message-row-${id}`} style={{ paddingTop: gap }}>
      {day !== null ? <DayChip testID={`day-${id}`} label={day} /> : null}
      {message ? (
        <Corrected to={correctedBy} onJump={onJump}>
          <MessageBubble message={message} phone={phone} onJump={onJump} highlight={highlight} />
        </Corrected>
      ) : call ? (
        <CallEntry call={call} onCallBack={onCallBack} />
      ) : null}
    </View>
  );
});
