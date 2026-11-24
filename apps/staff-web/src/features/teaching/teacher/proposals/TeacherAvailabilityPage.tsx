import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { TeacherAvailability } from './TeacherAvailability';

export function TeacherAvailabilityPage() {
  const me = useQuery(teacherMeQuery);
  const body = me.data ? <TeacherAvailability me={me.data} /> : <ListSkeleton />;
  return (
    <>
      <PageHead>
        <Cartouche>{t.availability.title}</Cartouche>
      </PageHead>
      {me.isError && !me.data ? <LoadRetry onRetry={me.refetch} /> : body}
    </>
  );
}
