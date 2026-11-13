import type { TeacherMe } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { PageHead } from '@/components/ui/layout/page';
import { teacherMeQuery } from '@/features/teaching/teacher';
import { t } from '@/lib/i18n/i18n';
import { loadState, type LoadState } from './load-state';
import { MeError } from './MeError';
import { StudentsBoard } from './StudentsBoard';

type MeQuery = UseQueryResult<TeacherMe>;

const BODY: Record<LoadState, (me: MeQuery) => ReactNode> = {
  ready: (me) => me.data && <StudentsBoard me={me.data} />,
  error: (me) => <MeError me={me} />,
  loading: () => <ListSkeleton />,
};

/**
 * /teacher/students «الطلاب» (R-TCH-03, docs/48): a thin page around the same TeacherBoard as
 * the home «طلابي» tab (segments, search, soonest next lesson first); a row opens «ملف الطالب».
 * Data first: a failed background refetch never covers a good board.
 */
export function TeacherStudents() {
  const me = useQuery(teacherMeQuery);
  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherStudents.title}</Cartouche>
      </PageHead>
      {BODY[loadState(me)](me)}
    </>
  );
}
