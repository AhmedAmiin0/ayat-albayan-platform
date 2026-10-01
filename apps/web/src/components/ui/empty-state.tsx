import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Amiri title from i18n, e.g. t.students.empty «لسه مفيش طلاب». */
  title: string;
  /** One sentence saying how the list fills. */
  children?: ReactNode;
  /** One primary action, e.g. <Button>{t.students.add}</Button>. */
  action?: ReactNode;
  className?: string;
}

/** docs/07 §10: dashed box, 56px gold double-outline rhombus (never the rosette). */
export function EmptyState({ title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid justify-items-center gap-2.5 rounded-[10px] border border-dashed border-rule-strong px-6 py-9 text-center',
        className,
      )}
    >
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-14 text-gold">
        <path d="M28 4 52 28 28 52 4 28Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M28 11 45 28 28 45 11 28Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 3" />
      </svg>
      <h2 className="font-display text-h3 font-bold">{title}</h2>
      {children && <p className="max-w-[36ch] text-sm text-pretty text-ink-2">{children}</p>}
      {action}
    </div>
  );
}
