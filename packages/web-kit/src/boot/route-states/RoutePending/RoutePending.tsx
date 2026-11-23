import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';

/** A route still loading (its guard or its code): the kit skeleton, never a blank page. */
export function RoutePending() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <ListSkeleton rows={3} />
    </div>
  );
}
