import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { teacherMeQuery } from '@/features/teaching/teacher';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MeError } from './MeError';
import { StudentsBoard } from './StudentsBoard';

/** Same board as the home tab (R-TCH-03, docs/48); a failed background refetch never covers it. */
export function TeacherStudents() {
  const me = useQuery(teacherMeQuery);
  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherStudents.title}</Cartouche>
      </PageHead>
      <QueryState query={me} error={<MeError me={me} />}>
        {(data) => <StudentsBoard me={data} />}
      </QueryState>
    </>
  );
}
