import type { useOutsideSlots } from './use-outside-slots';

export interface OtherTimeStatusProps {
  read: Pick<ReturnType<typeof useOutsideSlots>, 'isError' | 'isPending' | 'refetch'>;
}
