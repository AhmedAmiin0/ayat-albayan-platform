import { useQuery } from '@tanstack/react-query';
import { Cartouche, ListSkeleton, PageHead, t } from '@ab/web-kit';
import { teacherMeQuery } from '@/features/teaching/teacher/api';
import { LoadRetry } from '@/features/teaching/teacher/LoadRetry';
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
