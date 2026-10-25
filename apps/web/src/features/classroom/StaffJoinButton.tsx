import { isOpenLesson, joinWindow, type LessonStatus } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { LESSONS_KEY } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { useJoinWindow } from '@/lib/public-config';
import { classroomErrorText } from './errors';
import { EnterButton, type JoinableLesson } from './JoinButton';
import { openRoom } from './meetings-api';
import { useNow } from './use-now';

interface Props {
  lesson: JoinableLesson & { status: LessonStatus };
  size?: 'md' | 'lg';
}

/**
 * «ادخل الحلقة» for staff who may open the room (the admin, the lesson's teacher): while the room is
 * not open yet, «افتح الحلقة الآن» under the «تُفتح الساعة …» hint opens it for everyone at once
 * (POST /lessons/:id/room/open); the join button turns on without waiting for a refetch.
 */
export function StaffJoinButton({ lesson, size = 'md' }: Props) {
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
    <div className="grid justify-items-start gap-1.5">
      <EnterButton lesson={shown} size={size} now={now} />
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
