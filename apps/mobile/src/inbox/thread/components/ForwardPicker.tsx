import { FORWARD_MAX_TARGETS, type MessageView, type ThreadView } from '@ab/shared';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { ForwardRow } from './ForwardRow';
import { ChatPickList } from '@/inbox/thread/pick/ChatPickList';
import { chatName, forwardNotice, selectedLine } from '@/inbox/thread/hooks/forward-text';
import { useForward, useForwardId } from '@/inbox/thread/hooks/use-forward';

const MAX = FORWARD_MAX_TARGETS;

interface ForwardPickerProps {
  message: MessageView;
  /** The chat it comes from: left out of the list. */
  from: string;
  /** After the server answered: the sheet closes and the chat shows what happened. */
  onDone: () => void;
}

/**
 * Search (name / number, debounced: GET /threads?search=), the newest chats first, up to five picked.
 * «أرسل» posts the forward; the answer becomes the chat's notice (sent, and each skipped chat and why).
 * A failed post keeps the picks and says so; sending again reuses the same clientRequestId.
 */
export function ForwardPicker({ message, from, onDone }: ForwardPickerProps) {
  const { say } = useChatActions();
  const [picked, setPicked] = useState<ThreadView[]>([]);
  const forward = useForward();
  const idFor = useForwardId();
  const full = picked.length >= MAX;
  const pickedPhones = useMemo(() => new Set(picked.map((p) => p.phone_e164)), [picked]);
  // Stable (functional update): the rows are memo, a tick redraws only the row it changes (and the
  // others' disabled state when the fifth pick fills the list).
  const toggle = useCallback(
    (th: ThreadView) =>
      setPicked((now) =>
        now.some((p) => p.phone_e164 === th.phone_e164)
          ? now.filter((p) => p.phone_e164 !== th.phone_e164)
          : now.length < MAX
            ? [...now, th]
            : now,
      ),
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: ThreadView }) => {
      const on = pickedPhones.has(item.phone_e164);
      return <ForwardRow thread={item} checked={on} disabled={full && !on} onToggle={toggle} />;
    },
    [pickedPhones, full, toggle],
  );

  const send = () => {
    const targets = picked.map((p) => p.phone_e164);
    if (!targets.length) return;
    const names = new Map(picked.map((p) => [p.phone_e164, chatName(p)]));
    const body = { messageId: message.id, targets, clientRequestId: idFor(message.id, targets) };
    forward.mutate(body, {
      onSuccess: ({ results }) => {
        say(forwardNotice(results, (phone) => names.get(phone) ?? phone));
        onDone();
      },
    });
  };

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <ChatPickList
        renderItem={renderItem}
        exclude={(th) => th.phone_e164 === from}
        extraData={pickedPhones}
        note={
          <Note>
            {full ? t.inbox.forward.max.replace('{max}', String(MAX)) : selectedLine(picked.length, MAX)}
          </Note>
        }
      />
      {forward.isError ? <ErrorLine message={t.inbox.forward.error} /> : null}
      <Button
        label={
          forward.isPending ? t.inbox.forward.sending : `${t.inbox.forward.send} (${picked.length})`
        }
        accessibilityLabel={`${t.inbox.forward.send} · ${selectedLine(picked.length, MAX)}`}
        busy={forward.isPending}
        disabled={!picked.length}
        onPress={send}
      />
    </View>
  );
}
