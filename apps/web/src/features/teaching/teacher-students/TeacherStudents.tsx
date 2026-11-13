import type { TeacherMe } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { PageHead } from '@/components/ui/layout/page';
import { errorCode } from '@/features/teaching/schedule';
import { teacherMeQuery } from '@/features/teaching/teacher';
import { t } from '@/lib/i18n/i18n';
import { LoadError } from './LoadError';
import { loadState, type LoadState } from './load-state';
import { StudentsBoard } from './StudentsBoard';

interface ErrorText {
  text: string;
  retry: boolean;
}

/** A login with no teachers row cannot fix it by retrying; any other error can. */
const ERRORS: Partial<Record<string, ErrorText>> = {
  teacher_not_linked: { text: t.teacherDash.notLinked, retry: false },
};
const FALLBACK: ErrorText = { text: t.teacherDash.loadError, retry: true };

type MeQuery = UseQueryResult<TeacherMe>;

function MeError({ me }: { me: MeQuery }) {
  const e = ERRORS[errorCode(me.error) ?? ''] ?? FALLBACK;
  return <LoadError text={e.text} onRetry={e.retry ? me.refetch : undefined} />;
}

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
