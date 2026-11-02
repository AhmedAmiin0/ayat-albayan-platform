import { canStep, type SearchStep } from '@ab/client-core';
import type { KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { useChatSearch, type ChatSearchValue } from './search-context';
import { searchStatus } from './search-status';

/** Esc closes; Enter goes to the older hit, Shift+Enter to the newer one. */
const KEYS: Record<string, (s: ChatSearchValue) => void> = {
  Escape: (s) => s.close(),
  Enter: (s) => s.step('older'),
  'Shift+Enter': (s) => s.step('newer'),
};

/** The bar opens with the cursor in its field (WhatsApp). */
const focusOnMount = (el: HTMLInputElement | null): void => el?.focus();

const keyName = (e: KeyboardEvent): string => `${e.shiftKey ? 'Shift+' : ''}${e.key}`;

/** Up = older (higher in the chat), down = newer, as WhatsApp. */
const ARROWS: { dir: SearchStep; label: 'older' | 'newer'; turn: string }[] = [
  { dir: 'older', label: 'older', turn: 'rotate-180' },
  { dir: 'newer', label: 'newer', turn: '' },
];

/** The bar under the chat header while «بحث» is open: the words, «N من M», ↑ ↓ and close. */
export function ChatSearchBar() {
  const s = useChatSearch();
  if (!s?.state.open) return null;
  const onKey = (e: KeyboardEvent) => {
    const run = KEYS[keyName(e)];
    if (!run) return;
    e.preventDefault();
    run(s);
  };
  return (
    <div role="search" className="mt-2 flex items-center gap-1 rounded-md border border-rule bg-raised ps-2.5">
      <Icon name="search" className="text-ink-3" />
      <input
        ref={focusOnMount}
        type="search"
        dir="auto"
        aria-label={t.inbox.chatSearch.label}
        placeholder={t.inbox.chatSearch.placeholder}
        value={s.state.text}
        onChange={(e) => s.type(e.target.value)}
        onKeyDown={onKey}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none sm:min-h-9"
      />
      <span role="status" className="shrink-0 text-xs whitespace-nowrap text-ink-3 tabular-nums">
        {searchStatus(s)}
      </span>
      {ARROWS.map((a) => (
        <IconButton
          key={a.dir}
          label={t.inbox.chatSearch[a.label]}
          disabled={!canStep(s.state.index, a.dir, s.total)}
          onClick={() => s.step(a.dir)}
        >
          <Icon name="chevron-down" className={a.turn} />
        </IconButton>
      ))}
      <IconButton label={t.inbox.chatSearch.close} onClick={s.close}>
        <Icon name="x" />
      </IconButton>
    </div>
  );
}
