import type { ReactNode } from 'react';
import { Cartouche, PageHead, SegmentedControl, type SegmentedControlProps } from '@ab/web-kit';

/** The view filter is a filter, not a page; `children` are actions at the inline-end. */
export function ViewHead<V extends string>({
  title,
  children,
  ...views
}: { title: string; children?: ReactNode } & SegmentedControlProps<V>) {
  return (
    <PageHead>
      <Cartouche>{title}</Cartouche>
      <SegmentedControl {...views} />
      {children && <div className="ms-auto">{children}</div>}
    </PageHead>
  );
}
