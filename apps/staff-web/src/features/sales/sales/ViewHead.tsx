import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { SegmentedControl, type SegmentedControlProps } from '@/components/ui/form/segmented-control';

/**
 * A page title with its view filter beside it (owner 2026-10-12: «طلابي» and «مدفوعاتي» are filters, not
 * pages); `children` are the page's actions at the inline-end.
 */
export function ViewHead<V extends string>({ title, children, ...views }: { title: string; children?: ReactNode } & SegmentedControlProps<V>) {
  return (
    <PageHead>
      <Cartouche>{title}</Cartouche>
      <SegmentedControl {...views} />
      {children && <div className="ms-auto">{children}</div>}
    </PageHead>
  );
}
