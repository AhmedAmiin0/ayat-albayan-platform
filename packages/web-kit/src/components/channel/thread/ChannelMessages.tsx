import type { ChannelPage } from '@ab/shared';
import { Fragment } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/button';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { ChannelBubble } from '@ab/web-kit/components/channel/ChannelBubble';
import { threadAttrs } from '@ab/web-kit/components/channel/bubble/jump';
import { DayChip } from '@ab/web-kit/components/channel/rows/DayChip';
import { UnreadBand } from '@ab/web-kit/components/channel/rows/UnreadBand';
import { useThreadRows } from '@ab/web-kit/components/channel/rows/use-thread-rows';
import { t } from '@ab/web-kit/lib/i18n/i18n';

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
