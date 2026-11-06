import { replyRights, type ReplyLesson, type ThreadLesson } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { usePermissions } from '@/features/people/auth';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { usePublicConfig } from '@/lib/settings/public-config';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
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
 * No «تأكيد الحلقة» while no confirmation is required (owner 2026-11-02): «نعم» confirms itself.
 */
export function ReplyActionsProvider({ phone, lessons, children }: ReplyActionsProviderProps) {
  const mode = useInboxMode();
  const { can } = usePermissions();
  const client = useQueryClient();
  const [moving, setMoving] = useState<{ messageId: string; lesson: ReplyLesson } | null>(null);
  const moved = useQuery({ queryKey: movedKey(phone), queryFn: () => [] as string[], initialData: [] as string[], staleTime: Infinity, gcTime: Infinity });
  const rights = replyRights(can, mode === 'teacher' ? null : mode);
  const reschedule = rights.reschedule && mode === 'admin';
  const confirm = usePublicConfig().lesson_confirmation_required ? rights.confirm : null;
  const value: ReplyActions = {
    phone,
    lessons,
    rights: { reschedule, confirm },
    moved: moved.data,
    reschedule: (messageId, lesson) => setMoving({ messageId, lesson }),
  };
  const done = () => {
    if (moving) client.setQueryData<string[]>(movedKey(phone), (ids = []) => [...ids, moving.messageId]);
    void client.invalidateQueries({ queryKey: ['threads', 'detail', phone] });
    void refreshAnchored(client, phone);
  };
  return (
    <ReplyActionsContext.Provider value={value}>
      {children}
      {moving && <RescheduleLessonDrawer lesson={moving.lesson} onClose={() => setMoving(null)} onMoved={done} />}
    </ReplyActionsContext.Provider>
  );
}
