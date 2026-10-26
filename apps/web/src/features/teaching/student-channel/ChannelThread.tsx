import { CHANNEL_WRITES, threadMessages } from '@ab/client-core';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { channelQuery, markChannelRead, sendChannelMessage, type ChannelRef } from './api';
import { ChannelBubble } from './ChannelBubble';
import { ChannelComposer } from './ChannelComposer';

/**
 * One student's channel (docs/31 §2): oldest first, «الرسائل الأقدم» pages back, polled like the inbox. A
 * participant writes and marks the thread read; a monitor sees «للاطلاع فقط» and no composer.
 */
export function ChannelThread({ refs, tz }: { refs: ChannelRef; tz: string }) {
  const client = useQueryClient();
  const query = useInfiniteQuery(channelQuery(refs));
  const writes = CHANNEL_WRITES[refs.audience] && query.data?.pages[0]?.read_only !== true;
  const newest = query.data?.pages[0]?.messages.at(-1)?.id;
  const send = useMutation({
    mutationFn: (body: string) => sendChannelMessage({ ...refs, body }),
    onSettled: () => client.invalidateQueries({ queryKey: ['channel'] }),
  });
  useEffect(() => {
    if (!writes || !newest) return;
    void markChannelRead(refs).then(() => client.invalidateQueries({ queryKey: ['channel', refs.audience] }), () => undefined);
  }, [writes, newest, refs, client]);

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) {
    return (
      <FormAlert>
        {t.studentChannel.loadFailed}{' '}
        <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
          {t.studentChannel.retry}
        </Button>
      </FormAlert>
    );
  }
  const messages = threadMessages(query.data.pages);
  return (
    <section aria-label={t.studentChannel.monitorTitle} className="grid gap-3">
      {!writes && <p className="rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2">{t.studentChannel.readOnly}</p>}
      {query.hasNextPage && (
        <Button type="button" variant="ghost" size="sm" className="justify-self-center" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {t.studentChannel.older}
        </Button>
      )}
      {messages.length === 0 ? (
        <EmptyState title={t.studentChannel.empty}>{writes ? t.studentChannel.emptyHint : undefined}</EmptyState>
      ) : (
        <ol className="grid gap-2">
          {messages.map((m) => (
            <ChannelBubble key={m.id} message={m} tz={tz} />
          ))}
        </ol>
      )}
      {writes && <ChannelComposer pending={send.isPending} failed={send.isError} onSend={(body) => send.mutateAsync(body)} />}
    </section>
  );
}
