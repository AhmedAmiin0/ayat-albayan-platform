import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { myFeedbackQuery } from '@/features/feedback/api';
import { FeedbackTable } from '@/features/feedback/FeedbackTable';
import { TeacherAverages } from '@/features/feedback/TeacherAverages';
import { t } from '@/lib/i18n';

/** /teacher/feedback «آراء الطلاب»: only my students' answers (no phone, no guardian) and my average. */
export function MyFeedback() {
  const mine = useQuery(myFeedbackQuery);
  const average = mine.data?.average;
  return (
    <>
      <PageHead>
        <Cartouche>{t.feedback.mine}</Cartouche>
      </PageHead>
      {mine.isPending && <ListSkeleton />}
      {mine.isError && <FormAlert>{t.feedback.listError}</FormAlert>}
      {average && <TeacherAverages items={[{ key: 'me', avg: average.avg_rating, n: average.n, yesPct: average.recommend_yes_pct }]} />}
      {mine.data?.items.length === 0 && <EmptyState title={t.feedback.empty} />}
      {mine.data && mine.data.items.length > 0 && <FeedbackTable rows={mine.data.items} showTeacher={false} />}
    </>
  );
}
