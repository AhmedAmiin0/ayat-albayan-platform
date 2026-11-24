import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../lib/i18n/i18n';
import { Note } from '../ui/feedback/Note';
import { KeyboardFrame } from '../ui/layout/KeyboardFrame';
import type { ChannelRef, useChannel } from './channel-api';
import { ChannelComposer } from './compose/ChannelComposer';
import { ChannelMessageMenu } from './edits/ChannelMessageMenu';
import type { MenuOffers } from '@ab/client-core';
import { ChannelList } from './list/ChannelList';
import { ReadsSheet } from './reads/ReadsSheet';

interface ThreadBodyProps {
  refs: ChannelRef;
  query: ReturnType<typeof useChannel>;
  mode: 'write' | 'read';
  /** The newest page (read-only: why). */
  first: ChannelPage | undefined;
  /** In a sheet (the lesson room): its frame starts at the window's top, not under the inset. */
  frame?: ThreadFrame;
}

/** Where the thread is mounted: a screen of its own, or a sheet over another one. */
export type ThreadFrame = 'screen' | 'sheet';

/** For a monitor of a closed channel it also says why nobody writes yet. */
const readOnlyText = (page: ChannelPage | undefined): string =>
  page?.open === false
    ? `${t.studentChannel.readOnly} ${t.studentChannel.closedMonitor}`
    : t.studentChannel.readOnly;

type Held = { message: ChannelMessageView; offers: MenuOffers } | null;

export function ThreadBody({ refs, query, mode, first, frame = 'screen' }: ThreadBodyProps) {
  const [held, setHeld] = useState<Held>(null);
  const [replyTo, setReplyTo] = useState<ChannelMessageView | null>(null);
  const [readsOf, setReadsOf] = useState<string | null>(null);
  const writes = mode === 'write';
  const actions = {
    onHold: (message: ChannelMessageView, offers: MenuOffers) => setHeld({ message, offers }),
    onReply: setReplyTo,
    onReads: (m: ChannelMessageView) => setReadsOf(m.id),
  };
  return (
    <KeyboardFrame style={{ flex: 1 }} inScreen={frame === 'screen'}>
      {writes ? null : <Note>{readOnlyText(first)}</Note>}
      <ChannelList
        refs={refs}
        query={query}
        mode={mode}
        actions={actions}
        heldId={held?.message.id ?? null}
      />
      {writes ? (
        <View style={{ paddingTop: 4, paddingBottom: 8 }}>
          <ChannelComposer refs={refs} replyTo={replyTo} onReplyDone={() => setReplyTo(null)} />
        </View>
      ) : null}
      <ChannelMessageMenu
        key={held ? held.message.id : 'none'}
        refs={refs}
        held={held}
        onReply={actions.onReply}
        onReads={actions.onReads}
        onClose={() => setHeld(null)}
      />
      <ReadsSheet refs={refs} messageId={readsOf} onClose={() => setReadsOf(null)} />
    </KeyboardFrame>
  );
}
