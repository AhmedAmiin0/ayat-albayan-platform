import { replyRights, type ReplyLesson, type ThreadLesson } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { usePermissions } from '@/features/people/auth';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { usePublicConfig } from '@ab/web-kit';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import { movedKey, ReplyActionsContext, type ReplyActions } from './reply-actions-context';
import { RescheduleLessonDrawer } from './RescheduleLessonDrawer';

export interface ReplyActionsProviderProps {
  phone: string;
  lessons: readonly ThreadLesson[];
  children: ReactNode;
}

/** Sales' web schedule is read-only (docs/16 row 37), so sales confirm here and move in the app. */
export function ReplyActionsProvider({ phone, lessons, children }: ReplyActionsProviderProps) {
  const mode = useInboxMode();
  const { can } = usePermissions();
  const client = useQueryClient();
  const [moving, setMoving] = useState<{ messageId: string; lesson: ReplyLesson } | null>(null);
  const moved = useQuery({
    queryKey: movedKey(phone),
    queryFn: () => [] as string[],
    initialData: [] as string[],
    staleTime: Infinity,
    gcTime: Infinity,
  });
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
    if (moving)
      client.setQueryData<string[]>(movedKey(phone), (ids = []) => [...ids, moving.messageId]);
    void client.invalidateQueries({ queryKey: threadKeys.detail(phone) });
    void refreshAnchored(client, phone);
  };
  return (
    <ReplyActionsContext.Provider value={value}>
      {children}
      {moving && (
        <RescheduleLessonDrawer
          lesson={moving.lesson}
          onClose={() => setMoving(null)}
          onMoved={done}
        />
      )}
    </ReplyActionsContext.Provider>
  );
}
