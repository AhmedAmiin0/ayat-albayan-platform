import type { ReactNode } from 'react';
import { Skeleton, Button, t } from '@ab/web-kit';
import type { ChildSummaryRead } from '@/features/children/use-child-summary';
import type { Shown } from './ReadState.types';

export const shownOf = (read: ChildSummaryRead): Shown => {
  const failed: Shown = read.failed ? 'failed' : 'ready';
  return read.loading ? 'loading' : failed;
};

export const VIEW: Readonly<
  Record<Shown, (read: ChildSummaryRead, ready: ReactNode) => ReactNode>
> = {
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
