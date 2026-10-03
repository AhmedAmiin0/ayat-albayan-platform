import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { CLASSROOM_KEY, joinRoom } from './api';
import { ClassroomRoom } from './ClassroomRoom';
import { classroomErrorText, opensAtOf } from './errors';
import type { RoomClient } from './room-types';
import { opensAtText } from './window-hint';

/** One token per attempt (never cached, never refetched on focus): a fresh identity each time. */
function useJoin(lessonId: string, attempt: number) {
  return useQuery({
    queryKey: [...CLASSROOM_KEY, 'join', lessonId, attempt],
    queryFn: () => joinRoom(lessonId),
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

/** /classroom/:lessonId for admin, the lesson's teacher and the assigned assistant. */
export function StaffClassroomPage({ lessonId, make }: { lessonId: string; make?: () => RoomClient }) {
  const [attempt, setAttempt] = useState(0);
  const queryClient = useQueryClient();
  const join = useJoin(lessonId, attempt);
  const retry = () => {
    queryClient.removeQueries({ queryKey: [...CLASSROOM_KEY, 'join', lessonId] });
    setAttempt((n) => n + 1);
  };

  if (join.isPending) {
    return <main className="grid min-h-dvh place-items-center bg-page"><p role="status" className="text-sm text-ink-2">{t.classroom.joining}</p></main>;
  }
  if (join.error) {
    const opens = join.error instanceof ApiError ? opensAtOf(join.error) : null;
    const early = opens !== null && join.error instanceof ApiError && join.error.status === 403;
    return <Notice onRetry={retry}>{early ? opensAtText(opens) : classroomErrorText(join.error)}</Notice>;
  }
  return <ClassroomRoom join={join.data} {...(make && { make })} onRejoin={retry} />;
}
