import { FORWARD_MAX_TARGETS, type MessageView, type ThreadView } from '@ab/shared';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { SearchField } from '@/core/ui/form/SearchField';
import { useChatActions } from '../hooks/chat-actions';
import { ErrorLine } from '../../ErrorLine';
import { ForwardRow } from './ForwardRow';
import { chatName, forwardNotice, selectedLine } from '../hooks/forward-text';
import { useForward, useForwardId } from '../hooks/use-forward';
import { useThreadList } from '../../use-thread-list';

const MAX = FORWARD_MAX_TARGETS;

export interface ForwardPickerProps {
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
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<ThreadView[]>([]);
  const list = useThreadList({ search, unread: false });
  const forward = useForward();
  const idFor = useForwardId();
  const full = picked.length >= MAX;
  const isPicked = (th: ThreadView) => picked.some((p) => p.phone_e164 === th.phone_e164);
  const toggle = (th: ThreadView) =>
    setPicked((now) =>
      now.some((p) => p.phone_e164 === th.phone_e164)
        ? now.filter((p) => p.phone_e164 !== th.phone_e164)
        : now.length < MAX
          ? [...now, th]
          : now,
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
      <SearchField label={t.inbox.forward.search} onSearch={setSearch} />
      <Note>
        {full
          ? t.inbox.forward.max.replace('{max}', String(MAX))
          : selectedLine(picked.length, MAX)}
      </Note>
      <FlatList
        testID="forward-list"
        style={{ flex: 1, marginHorizontal: -16 }}
        keyboardShouldPersistTaps="handled"
        data={list.items.filter((th) => th.phone_e164 !== from)}
        keyExtractor={(th) => th.phone_e164}
        renderItem={({ item }) => {
          const on = isPicked(item);
          return <ForwardRow thread={item} checked={on} disabled={full && !on} onToggle={toggle} />;
        }}
        onEndReached={list.loadMore}
        ListEmptyComponent={
          list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : (
            <View style={{ padding: 16 }}>
              {list.isPending ? (
                <Note>{t.inbox.forward.loading}</Note>
              ) : (
                <EmptyState title={t.inbox.forward.empty} />
              )}
            </View>
          )
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
