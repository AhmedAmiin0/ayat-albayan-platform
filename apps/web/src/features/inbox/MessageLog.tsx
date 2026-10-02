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
}

/**
 * The thread as a live log (role=log: new messages are announced). Stays scrolled to the newest
 * message; «رسايل أقدم» pages back. Scrolls inside itself from 900px, with the page below that.
 */
export function MessageLog({ messages, hasMore, loadingOlder, onOlder, waitingKeys }: MessageLogProps) {
  const box = useRef<HTMLDivElement>(null);
  const newest = messages.at(-1)?.id;
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [newest]);
  const now = new Date();

  return (
    <div ref={box} className="min-h-[240px] shell:max-h-[min(62vh,620px)] shell:overflow-y-auto shell:pe-1">
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
