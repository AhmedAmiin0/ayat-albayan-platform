import type { MessageSearchHit } from '@ab/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { useChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { MessageHitRow } from './MessageHitRow';
import type { HitsPhase, MessageHitsState } from './use-message-hits';

export interface MessageHitsProps {
  hits: MessageHitsState;
  /** The message the open chat shows (URL `msg`): its row is marked current. */
  active?: string | undefined;
}

const WORDS = t.inbox.messageSearch;

/** The section's line: searching, failed or nothing found; none once hits show. */
const LINE: Record<HitsPhase, string> = {
  searching: t.inbox.chatSearch.searching,
  failed: WORDS.failed,
  empty: WORDS.empty,
  found: '',
};

/**
 * «الرسائل» under the chats (docs/37 NEW 1, as WhatsApp): matching messages, newest first, no
 * total; a tap opens that chat at that message and the list keeps the search beside it.
 */
export function MessageHits({ hits: s, active }: MessageHitsProps) {
  const heading = useId();
  const now = useNow();
  const { open } = useChatAnchor();
  const go = (hit: MessageSearchHit) => open({ phone: hit.phone_e164, msg: hit.id });
  const line = LINE[s.phase];
  return (
    <section aria-labelledby={heading} className="mt-3">
      <h3 id={heading} className="px-2.5 pb-1 text-xs font-semibold text-ink-3">
        {WORDS.section}
      </h3>
      {line && (
        <p role="status" className="px-2.5 py-2 text-sm text-ink-3">
          {line}
        </p>
      )}
      {s.hits.length > 0 && (
        <ul aria-labelledby={heading} className="border-t border-rule">
          {s.hits.map((hit) => (
            <MessageHitRow
              key={hit.id}
              hit={hit}
              q={s.q}
              active={hit.id === active}
              now={now}
              onOpen={go}
            />
          ))}
        </ul>
      )}
      {s.more && (
        <div className="flex justify-center py-2">
          <Button size="sm" variant="ghost" disabled={s.loadingMore} onClick={s.loadMore}>
            {s.loadingMore ? t.common.loading : WORDS.more}
          </Button>
        </div>
      )}
    </section>
  );
}
