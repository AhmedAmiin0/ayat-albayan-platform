import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { AssistantLessonRow } from '@/features/classroom/AssistantLessonRow';
import { t } from '@/lib/i18n';
import { salesLiveQuery } from './academy-api';

/**
 * /sales/live «الحلقات الجارية»: every lesson running now in the academy (the API's start <= now < end),
 * with the classroom assistant's row and «ادخل الحلقة» (POST /lessons/:id/room/join lets her in).
 */
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
