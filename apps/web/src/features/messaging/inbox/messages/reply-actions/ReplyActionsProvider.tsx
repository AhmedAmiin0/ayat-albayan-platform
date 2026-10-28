import { replyRights, type ReplyLesson, type ThreadLesson } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { usePermissions } from '@/features/people/auth';
import { useInboxMode } from '../../shared/mode';
import { movedKey, ReplyActionsContext, type ReplyActions } from './reply-actions-context';
import { RescheduleLessonDrawer } from './RescheduleLessonDrawer';

export interface ReplyActionsProviderProps {
  phone: string;
  lessons: readonly ThreadLesson[];
  children: ReactNode;
}

/**
 * The reply notes' actions for one chat (owner 2026-10-28). The web has the admin's reschedule drawer
 * only (sales' web schedule is read-only, docs/16 row 37): sales confirm here and move from the app.
 * Teacher mode: none. A move is remembered per chat for the session (the family lesson leaves the list).
 */
export function ReplyActionsProvider({ phone, lessons, children }: ReplyActionsProviderProps) {
  const mode = useInboxMode();
  const { can } = usePermissions();
  const client = useQueryClient();
  const [moving, setMoving] = useState<{ messageId: string; lesson: ReplyLesson } | null>(null);
  const moved = useQuery({ queryKey: movedKey(phone), queryFn: () => [] as string[], initialData: [] as string[], staleTime: Infinity, gcTime: Infinity });
  const rights = replyRights(can, mode === 'teacher' ? null : mode);
  const reschedule = rights.reschedule && mode === 'admin';
  const { confirm } = rights;
  const value = useMemo<ReplyActions>(
    () => ({
      phone,
      lessons,
      rights: { reschedule, confirm },
      moved: moved.data,
      reschedule: (messageId, lesson) => setMoving({ messageId, lesson }),
    }),
    [phone, lessons, reschedule, confirm, moved.data],
  );
  const done = () => {
    if (moving) client.setQueryData<string[]>(movedKey(phone), (ids = []) => [...ids, moving.messageId]);
    void client.invalidateQueries({ queryKey: ['threads', 'detail', phone] });
  };
  return (
    <ReplyActionsContext.Provider value={value}>
      {children}
      {moving && <RescheduleLessonDrawer lesson={moving.lesson} onClose={() => setMoving(null)} onMoved={done} />}
    </ReplyActionsContext.Provider>
  );
}
