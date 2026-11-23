import type { ChannelPage } from '@ab/shared';
import { Fragment } from 'react';
import { EmptyState, Button } from '#/components/ui/index.ts';
import type { ChannelRef } from '#/components/channel/api.ts';
import { ChannelBubble } from '#/components/channel/ChannelBubble.tsx';
import { threadAttrs } from '#/components/channel/bubble/jump.ts';
import { DayChip } from '#/components/channel/rows/DayChip.tsx';
import { UnreadBand } from '#/components/channel/rows/UnreadBand.tsx';
import { useThreadRows } from '#/components/channel/rows/use-thread-rows.ts';
import { t } from '#/lib/i18n/index.ts';

interface Props {
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  now: Date;
  /** This viewer's mode: only a writer is told how to start, only it is offered edits. */
  mode: 'write' | 'read';
  older: { has: boolean; loading: boolean; load: () => void };
}

/**
 * «الرسائل الأقدم», then the messages oldest first under their day chips with the unread band, or
 * the empty state. Each message keeps its key from its client_id once the API stores it, so my
 * pending row turns into the stored message without fading in twice.
 */
export function ChannelMessages({ pages, refs, tz, now, mode, older }: Props) {
  const rows = useThreadRows({ pages, tz, now, more: older.has });
  return (
    <>
      {older.has && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-center"
          disabled={older.loading}
          onClick={older.load}
        >
          {t.studentChannel.older}
        </Button>
      )}
      {rows.length === 0 ? (
        <EmptyState title={t.studentChannel.empty}>
          {mode === 'write' ? t.studentChannel.emptyHint : undefined}
        </EmptyState>
      ) : (
        <ol {...threadAttrs} className="grid gap-1.5">
          {rows.map(({ message: m, opensDay, dayText, unread, followUp, arrived }) => (
            <Fragment key={m.client_id ?? m.id}>
              {opensDay && <DayChip text={dayText} />}
              {unread !== null && <UnreadBand count={unread} />}
              <ChannelBubble
                {...{ message: m, tz, refs, now, mode, followUp, arrived }}
              />
            </Fragment>
          ))}
        </ol>
      )}
    </>
  );
}
