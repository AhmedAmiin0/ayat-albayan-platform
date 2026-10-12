import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { SegmentedControl, type SegmentedControlProps } from '@/components/ui/segmented-control';

/** A page title with its view filter beside it (owner 2026-10-12: «طلابي» and «مدفوعاتي» are filters, not pages). */
export function ViewHead<V extends string>({ title, ...views }: { title: string } & SegmentedControlProps<V>) {
  return (
    <PageHead>
      <Cartouche>{title}</Cartouche>
      <SegmentedControl {...views} />
    </PageHead>
  );
}
