import { useQuery } from '@tanstack/react-query';
import { Cartouche, QueryState, PageHead, t } from '@ab/web-kit';
import { teacherMeQuery } from '@/features/teaching/teacher';
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
