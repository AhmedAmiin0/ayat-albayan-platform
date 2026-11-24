import { useQuery } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { AssistantLessonRow } from '@/features/teaching/classroom/sessions/AssistantLessonRow';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { salesLiveQuery } from '@/features/sales/sales/academy-api';

/** Every lesson running now (start <= now < end); POST /lessons/:id/room/join lets her in. */
export function SalesLive() {
  const live = useQuery(salesLiveQuery);
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.live.title}</Cartouche>
      </PageHead>
      {live.isPending && <ListSkeleton />}
      {live.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void live.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {live.data?.length === 0 && <EmptyState title={t.sales.live.empty} />}
      {live.data && live.data.length > 0 && (
        <ul aria-label={t.sales.live.title}>
          {live.data.map((l) => (
            <AssistantLessonRow key={l.lesson_id} lesson={l} />
          ))}
        </ul>
      )}
    </>
  );
}
