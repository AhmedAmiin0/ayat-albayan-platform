import type { MessageView } from '@ab/shared';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { withDays, type LogItem } from './day-groups';
import { JumpToLatest } from './JumpToLatest';
import { MessageBubble } from './MessageBubble';
import { lastOwnSend } from './composer/lib/own-send';
import { isNearBottom } from './stick-to-bottom';

export interface MessageLogProps {
  /** The chat's number: her own last send in it (own-send) snaps the log down. */
  phone: string;
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
   * the log is a capped box and the thread scrolls as one column. `phone` (< 900px): the
   * full-screen chat, where the log always fills the room between the header and the composer.
   */
  fill?: 'shell' | 'xl' | 'phone';
}

const BOX = {
  shell: 'min-h-[240px] shell:min-h-0 shell:flex-1 shell:overflow-y-auto shell:overscroll-contain shell:pe-1',
  xl: 'min-h-[240px] shell:max-h-[min(62vh,620px)] shell:overflow-y-auto shell:overscroll-contain shell:pe-1 xl:max-h-none xl:min-h-0 xl:flex-1',
  phone: 'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-sunk px-2.5 py-3',
};

/** Hidden from screen readers: each bubble's <time> reads its full date instead. */
function Day({ label }: { label: string }) {
  return (
    <li className="flex justify-center py-1" aria-hidden="true">
      <span className="rounded-full border border-rule bg-raised px-2.5 py-0.5 text-2xs font-semibold text-ink-3">{label}</span>
    </li>
  );
}

/**
 * The thread as a live log (role=log: new messages are announced). Opens at the newest message and
 * stays pinned there as messages arrive, unless the reader scrolled up: then «الانتقال إلى أحدث رسالة»
 * counts what came in below. Her own send (the id her composer recorded) always snaps to the bottom; «رسائل أقدم» pages back.
 * A separator before each day's first message, at every width (the bubbles show the clock only).
 */
export function MessageLog({ phone, messages, hasMore, loadingOlder, onOlder, waitingKeys, fill = 'shell' }: MessageLogProps) {
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const newest = messages.at(-1)?.id;
  // Her send recorded before its row arrived, or (a poll first) after: either way the log follows it.
  const own = !!newest && newest === lastOwnSend(phone);
  // The newest id she had seen when she scrolled up; null while pinned at the bottom.
  const [awayAt, setAwayAt] = useState<string | null>(null);
  const [prev, setPrev] = useState({ newest, own });
  if (newest !== prev.newest || own !== prev.own) {
    setPrev({ newest, own });
    if (own) setAwayAt(null);
  }
  // Only a new newest row (or it turning out to be hers) moves the reader, never a status change.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !(pinned.current || own)) return;
    el.scrollTop = el.scrollHeight;
    pinned.current = true;
  }, [newest, own]);
  const jump = () => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
    setAwayAt(null);
  };
  const now = new Date();
  const items: LogItem[] = withDays(messages, now);
  const seen = awayAt === null ? -1 : messages.findIndex((m) => m.id === awayAt);
  const unseen = seen < 0 ? 0 : messages.length - 1 - seen;

  return (
    <div
      ref={box}
      className={BOX[fill]}
      onScroll={(e) => {
        const near = isNearBottom(e.currentTarget);
        pinned.current = near;
        if (near && awayAt !== null) setAwayAt(null);
        else if (!near && awayAt === null) setAwayAt(newest ?? '');
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
        {/* minmax(0,1fr): a long unbroken link never widens the column past the chat (it scrolled sideways). */}
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
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
      {awayAt !== null && <JumpToLatest count={unseen} onJump={jump} />}
    </div>
  );
}
