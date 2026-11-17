import { threadMessages } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Button } from '@ab/web-kit/components/ui/form/button';
import type { ChannelRef } from '@/features/teaching/student-channel/api';
import { ChannelBubble } from '@/features/teaching/student-channel/ChannelBubble';
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

/** «الرسائل الأقدم», then the messages oldest first, or the empty state. */
export function ChannelMessages({ pages, refs, tz, now, mode, older }: Props) {
  const messages = threadMessages(pages);
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
      {messages.length === 0 ? (
        <EmptyState title={t.studentChannel.empty}>
          {mode === 'write' ? t.studentChannel.emptyHint : undefined}
        </EmptyState>
      ) : (
        <ol className="grid gap-2">
          {messages.map((m) => (
            <ChannelBubble key={m.id} message={m} tz={tz} refs={refs} now={now} mode={mode} />
          ))}
        </ol>
      )}
    </>
  );
}
