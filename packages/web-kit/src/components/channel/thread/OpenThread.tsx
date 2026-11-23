import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { useState } from 'react';
import type { ChannelRef } from '#/components/channel/api.ts';
import { BubbleToolsContext } from '#/components/channel/bubble/bubble-tools.ts';
import { ChannelComposer } from '#/components/channel/composer/ChannelComposer.tsx';
import { draftKey } from '#/components/channel/composer/draft-store.ts';
import { ConnectionBar } from '#/components/channel/head/ConnectionBar.tsx';
import { ThreadHead } from '#/components/channel/head/ThreadHead.tsx';
import { ReadsDialog } from '#/components/channel/reads/ReadsDialog.tsx';
import { t } from '#/lib/i18n/index.ts';
import { ChannelLoadFailed } from './ChannelLoadFailed';
import { ChannelMessages } from './ChannelMessages';
import type { useChannelThread } from './use-channel-thread';
import { useStickToEnd } from './use-stick-to-end';

const NOTE = 'rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2';
const c = t.studentChannel;
/** «للاطلاع فقط», and for a monitor of a closed channel why nobody writes yet. */
const readOnlyText = (open: boolean | undefined) =>
  open === false ? `${c.readOnly} ${c.closedMonitor}` : c.readOnly;

interface Props {
  thread: ReturnType<typeof useChannelThread> & { mode: 'write' | 'read' };
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  head: { label: string; heading: string };
}

/**
 * A thread that reads (a monitor) or writes (a participant's open channel): the head (title,
 * people, presence), the connecting bar, the messages, the newest kept in view, and the composer
 * with its reply bar. «ردّ» and «معلومات الرسالة» reach the bubbles through BubbleToolsContext. A
 * failed re-read is one inline line: the thread and the draft stay.
 */
export function OpenThread({ thread, pages, refs, tz, head }: Props) {
  const { query, first, mode, send, now } = thread;
  const [replyTo, setReplyTo] = useState<ChannelMessageView | null>(null);
  const [info, setInfo] = useState<ChannelMessageView | null>(null);
  const end = useStickToEnd(first?.messages.at(-1)?.id);
  const older = {
    has: query.hasNextPage,
    loading: query.isFetchingNextPage,
    load: () => void query.fetchNextPage(),
  };
  return (
    <section aria-label={head.label} className="grid gap-3">
      <ThreadHead title={head.heading} {...{ pages, refs, tz, now }} />
      <ConnectionBar />
      {mode === 'read' && <p className={NOTE}>{readOnlyText(first?.open)}</p>}
      {query.isError && <ChannelLoadFailed onRetry={() => void query.refetch()} inline />}
      <BubbleToolsContext value={{ reply: setReplyTo, info: setInfo }}>
        <ChannelMessages {...{ pages, refs, tz, now, mode, older }} />
      </BubbleToolsContext>
      <div ref={end} className="scroll-mb-[var(--chat-end-gap,0px)]" />
      {mode === 'write' && (
        <ChannelComposer
          key={draftKey(refs)}
          refs={refs}
          draft={draftKey(refs)}
          send={send}
          reply={{ to: replyTo, cancel: () => setReplyTo(null) }}
        />
      )}
      {info && (
        <ReadsDialog refs={refs} message={info} tz={tz} now={now} onClose={() => setInfo(null)} />
      )}
    </section>
  );
}
