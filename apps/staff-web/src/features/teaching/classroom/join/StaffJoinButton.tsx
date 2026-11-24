import type { LessonStatus } from '@ab/catalog';
import { isOpenLesson, joinWindow } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useJoinWindow } from '@ab/web-kit/lib/settings/public-config';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { EnterButton, type JoinableLesson } from './JoinButton';
import { openRoom } from '@/features/teaching/classroom/api/meetings-api';
import { useNow } from '@ab/web-kit/lib/time/use-now';

interface Props {
  lesson: JoinableLesson & { status: LessonStatus };
  size?: 'md' | 'lg';
  /** The open join's fill (docs/48: secondary when the teacher's report leads). */
  variant?: 'primary' | 'secondary';
}

/** Opening early opens the room for everyone (POST /lessons/:id/room/open); join enables now. */
export function StaffJoinButton({ lesson, size = 'md', variant }: Props) {
  const now = useNow();
  const win = useJoinWindow();
  const client = useQueryClient();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const shown = openedAt ? { ...lesson, room_opened_at: openedAt } : lesson;
  const open = useMutation({
    mutationFn: openRoom,
    // The server's instant may be a moment after this page's minute clock: open from whichever is first.
    onSuccess: (r) => {
      setOpenedAt(new Date(Math.min(Date.parse(r.room_opened_at), now.getTime())).toISOString());
      void client.invalidateQueries({ queryKey: LESSONS_KEY });
    },
  });
  if (!isOpenLesson(lesson.status)) return null;
  const early = joinWindow(shown, now, win).state === 'early';
  return (
    <div className="grid gap-1.5">
      <EnterButton lesson={shown} size={size} now={now} variant={variant} className="justify-items-stretch" />
      {early && (
        <Button type="button" variant="secondary" size={size} disabled={open.isPending} onClick={() => open.mutate(lesson.id)}>
          {open.isPending ? t.classroom.opening : t.classroom.openNow}
        </Button>
      )}
      {open.isSuccess && !early && <p role="status" className="text-xs text-ink-2">{t.classroom.openedHint}</p>}
      {open.isError && <FormAlert>{classroomErrorText(open.error)}</FormAlert>}
    </div>
  );
}
