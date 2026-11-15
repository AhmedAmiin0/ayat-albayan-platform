import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Skeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

interface BlockProps {
  title: string;
  hint?: string;
  /** Buttons at the inline-end of the title row. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** One card of the Google section: a titled region on raised paper; it never widens the page. */
export function GoogleBlock({ title, hint, actions, children, className }: BlockProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn('grid min-w-0 gap-3 rounded-lg border border-rule bg-raised px-4 py-4', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h4 id={id} className="text-sm font-bold">
          {title}
        </h4>
        {actions && <div className="ms-auto flex flex-wrap gap-2">{actions}</div>}
      </div>
      {hint && <p className="max-w-[70ch] text-xs text-ink-2">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Loading bars without role=status: the settings page owns the one status region (its toast);
 * aria-busy and the words stay for screen readers.
 */
export function BlockSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" data-testid="google-skeleton" className="grid gap-2.5 py-2">
      <span className="sr-only">{t.common.loading}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={i % 2 ? 'w-2/3' : 'w-1/2'} />
      ))}
    </div>
  );
}

/** A block that could not load: a quiet line (no role=alert at rest) and «إعادة المحاولة». */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-ink-2">{message}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {t.googleSync.retry}
      </Button>
    </div>
  );
}
