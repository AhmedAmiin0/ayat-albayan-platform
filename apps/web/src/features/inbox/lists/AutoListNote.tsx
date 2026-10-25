import type { ChatListAutoRule } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const L = t.inbox.lists;

export interface AutoListNoteProps {
  rule: ChatListAutoRule;
  className?: string;
}

/** The quiet «تُحدَّث تلقائيًا» chip of an automatic list (docs/22 «القوائم التلقائية»). */
export function AutoListChip({ id, className }: { id?: string; className?: string }) {
  return (
    <span
      id={id}
      data-testid="auto-list-chip"
      className={cn('inline-flex h-[22px] shrink-0 items-center rounded-full border border-ink-2/25 bg-neutral-soft px-2 text-xs font-semibold leading-none text-ink-2', className)}
    >
      {L.auto}
    </span>
  );
}

/** The chip, then one line saying who is added: «يُضاف إليها تلقائيًا كل …». */
export function AutoListNote({ rule, className }: AutoListNoteProps) {
  return (
    <p className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3', className)}>
      <AutoListChip />
      <span className="min-w-0">{L.autoRule[rule]}</span>
    </p>
  );
}
