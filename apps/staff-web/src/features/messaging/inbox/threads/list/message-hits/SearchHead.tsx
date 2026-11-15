import { t } from '@/lib/i18n/i18n';
import type { MessageHitsState } from './use-message-hits';

export interface SearchHeadProps {
  hits: Pick<MessageHitsState, 'q' | 'shown'>;
  /** Chats match the box too. */
  chats: boolean;
}

/**
 * Under the search box (docs/37): at 1–2 characters, the hint that message text needs 3; with
 * both sections shown, «المحادثات» over the chats.
 */
export function SearchHead({ hits, chats }: SearchHeadProps) {
  return (
    <>
      {hits.q !== '' && !hits.shown && (
        <p className="px-2.5 py-1 text-2xs text-ink-3">{t.inbox.messageSearch.hint}</p>
      )}
      {hits.shown && chats && (
        <h3 className="px-2.5 pt-2 pb-1 text-xs font-semibold text-ink-3">{t.inbox.messageSearch.chats}</h3>
      )}
    </>
  );
}
