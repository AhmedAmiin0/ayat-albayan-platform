import type { MessageView } from '@ab/shared';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { MessageBubble } from './MessageBubble';

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
   * the log is a capped box and the thread scrolls as one column.
   */
  fill?: 'shell' | 'xl';
}

const BOX = {
  shell: 'min-h-[240px] shell:min-h-0 shell:flex-1 shell:overflow-y-auto shell:overscroll-contain shell:pe-1',
  xl: 'min-h-[240px] shell:max-h-[min(62vh,620px)] shell:overflow-y-auto shell:overscroll-contain shell:pe-1 xl:max-h-none xl:min-h-0 xl:flex-1',
};

/**
 * The thread as a live log (role=log: new messages are announced). Stays scrolled to the newest
 * message; «رسايل أقدم» pages back. Scrolls inside itself from 900px, with the page below that.
 */
export function MessageLog({ messages, hasMore, loadingOlder, onOlder, waitingKeys, fill = 'shell' }: MessageLogProps) {
  const box = useRef<HTMLDivElement>(null);
  const newest = messages.at(-1)?.id;
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [newest]);
  const now = new Date();

  return (
    <div ref={box} className={BOX[fill]}>
      {hasMore && (
        <div className="mb-3 flex justify-center">
          <Button size="sm" variant="ghost" disabled={loadingOlder} onClick={onOlder}>
            {loadingOlder ? t.common.loading : t.inbox.loadOlder}
          </Button>
        </div>
      )}
      <div role="log" aria-label={t.messages.log}>
        <ol className="grid gap-2.5">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              now={now}
              waitingTemplate={m.status === 'queued' && !!m.template_key && waitingKeys.has(m.template_key)}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
