import { replyRights, type ReplyLesson, type ThreadLesson } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useHolds, usePermissions } from '@ab/mobile-kit';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import { refreshChat } from '@/inbox/thread/hooks/inbox-sync';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { ReplyActionsContext, replyMovedKey, type ReplyActionsValue, type ReplyMove } from './reply-actions-context';
import { ReplyRescheduleSheet } from './ReplyRescheduleSheet';

interface ReplyActionsProviderProps {
  phone: string;
  lessons: readonly ThreadLesson[];
  children: ReactNode;
}

/** Sales and admin get their own sheet and route, a teacher none; moves are remembered per chat. */
export function ReplyActionsProvider({ phone, lessons, children }: ReplyActionsProviderProps) {
  const teacher = useThreadMode().kind === 'teacher';
  const sales = useHolds('self.sales');
  const can = usePermissions();
  const client = useQueryClient();
  const [move, setMove] = useState<ReplyMove | null>(null);
  const moved = useQuery({ queryKey: replyMovedKey(phone), queryFn: () => [] as string[], initialData: [] as string[], staleTime: Infinity, gcTime: Infinity });
  const flow = teacher ? null : sales ? 'sales' : 'admin';
  const rights = replyRights(can, flow);
  const { reschedule } = rights;
  // Confirm is offered only while the academy requires confirmation.
  const confirm = useLessonStatusText().required ? rights.confirm : null;
  const value = useMemo<ReplyActionsValue>(
    () => ({
      phone,
      lessons,
      rights: { reschedule, confirm },
      moved: moved.data,
      openMove: (messageId: string, lesson: ReplyLesson) => {
        if (flow) setMove({ messageId, lesson, flow });
      },
    }),
    [phone, lessons, reschedule, confirm, moved.data, flow],
  );
  // Closed by a swipe too (even after a move): the chat re-reads, so a moved lesson's button goes.
  const close = () => {
    setMove(null);
    void refreshChat(client, phone);
  };
  const done = () => {
    if (move) client.setQueryData<string[]>(replyMovedKey(phone), (ids = []) => [...ids, move.messageId]);
    close();
  };
  return (
    <ReplyActionsContext.Provider value={value}>
      {children}
      {move ? <ReplyRescheduleSheet move={move} onClose={close} onDone={done} /> : null}
    </ReplyActionsContext.Provider>
  );
}
