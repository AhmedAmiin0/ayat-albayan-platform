import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { AssistantLessonRow } from '@/features/classroom/sessions/AssistantLessonRow';
import { t } from '@/lib/i18n/i18n';
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
