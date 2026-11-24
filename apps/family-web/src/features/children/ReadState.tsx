import type { ReactNode } from 'react';
import { Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ChildSummaryRead } from './use-child-summary';

type Shown = 'loading' | 'failed' | 'ready';

const shownOf = (read: ChildSummaryRead): Shown => {
  const failed: Shown = read.failed ? 'failed' : 'ready';
  return read.loading ? 'loading' : failed;
};

const VIEW: Readonly<Record<Shown, (read: ChildSummaryRead, ready: ReactNode) => ReactNode>> = {
  loading: () => (
    <span role="status" aria-busy="true" className="grid gap-2">
      <span className="sr-only">{t.common.loading}</span>
      <Skeleton className="h-14" />
    </span>
  ),
  failed: (read) => (
    <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
      {t.portal.loadFailed}
      <Button type="button" variant="secondary" size="sm" onClick={() => void read.retry()}>
        {t.portal.retry}
      </Button>
    </p>
  ),
  ready: (_read, ready) => <div className="grid animate-fade-in gap-3">{ready}</div>,
};

/** Waits for every read so a failure never shows a false empty state; retry on failure. */
export function ReadState({ read, children }: { read: ChildSummaryRead; children: ReactNode }) {
  return <>{VIEW[shownOf(read)](read, children)}</>;
}
