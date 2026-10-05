import type { MessageView } from '@ab/shared';
import { useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { withDays, type LogItem } from './day-groups';
import { MessageBubble } from './MessageBubble';
import { isNearBottom } from './stick-to-bottom';

export interface MessageLogProps {
  /** Oldest → newest. */
  messages: MessageView[];
  hasMore: boolean;
  loadingOlder: boolean;
  onOlder: () => void;
  /** Template keys not approved on Meta yet (their queued rows wait). */
  waitingKeys: ReadonlySet<string>;
  /**
   * From which width the log fills its column (the reply box pinned under it): `shell` (900px)
   * when nothing sits beside the thread, `xl` when the lead/family panel does. Below that width
   * the log is a capped box and the thread scrolls as one column. `phone` (< 640px): the
   * full-screen chat, where the log always fills the room between the header and the composer.
   */
  fill?: 'shell' | 'xl' | 'phone';
}

const BOX = {
  shell: 'min-h-[240px] shell:min-h-0 shell:flex-1 shell:overflow-y-auto shell:overscroll-contain shell:pe-1',
  xl: 'min-h-[240px] shell:max-h-[min(62vh,620px)] shell:overflow-y-auto shell:overscroll-contain shell:pe-1 xl:max-h-none xl:min-h-0 xl:flex-1',
  phone: 'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-sunk px-2.5 py-3',
};

function Day({ label }: { label: string }) {
  return (
    <li className="flex justify-center py-1" aria-hidden="true">
      <span className="rounded-full border border-rule bg-raised px-2.5 py-0.5 text-2xs font-semibold text-ink-3">{label}</span>
    </li>
  );
}

/**
 * The thread as a live log (role=log: new messages are announced). Opens at the newest message and
 * stays pinned there as messages arrive, unless the reader scrolled up; «رسائل أقدم» pages back.
 * Scrolls inside itself from 900px and on phones, with the page in between. Phones get day separators.
 */
export function MessageLog({ messages, hasMore, loadingOlder, onOlder, waitingKeys, fill = 'shell' }: MessageLogProps) {
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const newest = messages.at(-1)?.id;
  useLayoutEffect(() => {
    const el = box.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [newest]);
  const now = new Date();
  const items: LogItem[] = fill === 'phone' ? withDays(messages, now) : messages.map((message) => ({ kind: 'message', message }));

  return (
    <div
      ref={box}
      className={BOX[fill]}
      onScroll={(e) => {
        pinned.current = isNearBottom(e.currentTarget);
      }}
    >
      {hasMore && (
        <div className="mb-3 flex justify-center">
          <Button size="sm" variant="ghost" disabled={loadingOlder} onClick={onOlder}>
            {loadingOlder ? t.common.loading : t.inbox.loadOlder}
          </Button>
        </div>
      )}
      <div role="log" aria-label={t.messages.log}>
        <ol className="grid gap-2.5">
          {items.map((item) =>
            item.kind === 'day' ? (
              <Day key={item.key} label={item.label} />
            ) : (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                now={now}
                waitingTemplate={item.message.status === 'queued' && !!item.message.template_key && waitingKeys.has(item.message.template_key)}
              />
            ),
          )}
        </ol>
      </div>
    </div>
  );
}
