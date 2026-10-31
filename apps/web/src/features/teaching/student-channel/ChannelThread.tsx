import { channelKey, channelMode, liveChannelId, threadMessages } from '@ab/client-core';
import { useInfiniteQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { CHANNEL_COUNT_KEYS, channelQuery, markChannelRead, sendChannelMessage, type ChannelRef } from './api';
import { ChannelBubble } from './ChannelBubble';
import { ChannelComposer } from './ChannelComposer';
import { useChannelLive } from './use-channel-live';

const NOTE = 'rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2';
/** «للاطلاع فقط», and for a monitor of a closed channel why nobody writes yet. */
const readOnlyText = (open: boolean | undefined) =>
  open === false ? `${t.studentChannel.readOnly} ${t.studentChannel.closedMonitor}` : t.studentChannel.readOnly;
const refreshCounts = (client: QueryClient) => Promise.all(CHANNEL_COUNT_KEYS.map((queryKey) => client.invalidateQueries({ queryKey })));

interface Props {
  refs: ChannelRef;
  tz: string;
  /** The student's name above the thread (the teacher's page, where nothing else names it). */
  named?: boolean;
}

/**
 * One student's channel (docs/31 §2): oldest first, «الرسائل الأقدم» pages back, the newest message kept in
 * view; live over the socket (use-channel-live), polled as the fallback. A participant writes and marks
 * read up to the newest message shown; before the subscription and the teacher's assignment (owner
 * 2026-10-29) only the closed line. A monitor sees «للاطلاع فقط» and no composer.
 */
export function ChannelThread({ refs, tz, named = false }: Props) {
  const { audience, studentId } = refs;
  const client = useQueryClient();
  const [live, setLive] = useState(false);
  const query = useInfiniteQuery(channelQuery({ audience, studentId }, live));
  const end = useRef<HTMLDivElement>(null);
  const first = query.data?.pages[0];
  const mode = channelMode(audience, first);
  const writes = mode === 'write';
  useChannelLive(refs, { channelId: liveChannelId(mode, first), onLive: setLive });
  const newest = first?.messages.at(-1);
  // One ticking clock for every bubble (not new Date() in render, which the compiler would keep).
  const now = useNow();
  const send = useMutation({
    mutationFn: (body: string) => sendChannelMessage({ audience, studentId, body }),
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: channelKey(audience, studentId) }), refreshCounts(client)]),
  });
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
    if (!writes || !newest) return;
    void markChannelRead({ audience, studentId, at: newest.created_at }).then(() => refreshCounts(client), () => undefined);
  }, [writes, newest, audience, studentId, client]);

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
  const name = query.data.pages[0]?.student_name ?? '';
  const label = name ? `${t.studentChannel.title} · ${name}` : t.studentChannel.title;
  if (mode === 'closed') return <ClosedChannel label={label} name={named ? name : ''} />;
  return (
    <section aria-label={label} className="grid gap-3">
      {named && name && <h2 className="font-display text-h3 font-bold">{name}</h2>}
      {!writes && <p className={NOTE}>{readOnlyText(first?.open)}</p>}
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
            <ChannelBubble key={m.id} message={m} tz={tz} refs={refs} now={now} />
          ))}
        </ol>
      )}
      <div ref={end} />
      {writes && <ChannelComposer pending={send.isPending} failed={send.isError} onSend={(body) => send.mutateAsync(body)} />}
    </section>
  );
}

/** Before the subscription and the teacher's assignment (owner 2026-10-29): the closed line, no composer. */
function ClosedChannel({ label, name }: { label: string; name: string }) {
  return (
    <section aria-label={label} className="grid gap-3">
      {name && <h2 className="font-display text-h3 font-bold">{name}</h2>}
      <p role="status" className={NOTE}>
        {t.studentChannel.closed}
      </p>
    </section>
  );
}
