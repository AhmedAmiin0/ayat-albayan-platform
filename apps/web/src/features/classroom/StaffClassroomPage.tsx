import type { RoomJoinResult } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CLASSROOM_KEY, joinRoom } from './api';
import { ClassroomRoom } from './ClassroomRoom';
import { classroomErrorText, opensAtOf } from './errors';
import type { RoomClient } from './room-types';
import { opensAtText } from './window-hint';

/** Who mints the token: the lesson's room by default, an internal meeting's (joinMeeting) otherwise. */
type Joiner = (id: string) => Promise<RoomJoinResult>;

/** One token per attempt (never cached, never refetched on focus): a fresh identity each time. */
function useJoin(lessonId: string, attempt: number, join: Joiner) {
  return useQuery({
    queryKey: [...CLASSROOM_KEY, 'join', lessonId, attempt],
    queryFn: () => join(lessonId),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

function Notice({ children, onRetry }: { children: string; onRetry: () => void }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[520px] content-center gap-4 bg-page p-4">
      <FormAlert>{children}</FormAlert>
      <Button type="button" variant="secondary" onClick={onRetry} className="justify-self-start">
        {t.classroom.retry}
      </Button>
    </main>
  );
}

interface Props {
  lessonId: string;
  make?: () => RoomClient;
  join?: Joiner;
  /** A refused join in the page's own words (a meeting's, meetingJoinProblem); the lesson's by default. */
  problem?: (error: unknown) => string;
}

/** A 403 with opens_at reads «تُفتح الساعة …»; every other code has its own line. */
function lessonProblem(error: unknown): string {
  const opens = error instanceof ApiError && error.status === 403 ? opensAtOf(error) : null;
  return opens !== null ? opensAtText(opens) : classroomErrorText(error);
}

/** /classroom/:lessonId for admin, the lesson's teacher and the assigned assistant; /meeting/:id with `join`. */
export function StaffClassroomPage({ lessonId, make, join: joiner = joinRoom, problem = lessonProblem }: Props) {
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();
  const join = useJoin(lessonId, attempt, joiner);
  const retry = () => {
    queryClient.removeQueries({ queryKey: [...CLASSROOM_KEY, 'join', lessonId] });
    setAttempt((n) => n + 1);
  };

  if (join.isPending) {
    return <main className="grid min-h-dvh place-items-center bg-page"><p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p></main>;
  }
  if (join.error) return <Notice onRetry={retry}>{problem(join.error)}</Notice>;
  return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={retry} />;
}
