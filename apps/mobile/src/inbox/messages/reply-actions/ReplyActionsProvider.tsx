import { replyRights, type ReplyLesson, type ThreadLesson } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useHolds, usePermissions } from '@/auth';
import { threadKey } from '../../thread/hooks/thread-cache';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import { ReplyActionsContext, replyMovedKey, type ReplyActionsValue, type ReplyMove } from './reply-actions-context';
import { ReplyRescheduleSheet } from './ReplyRescheduleSheet';

interface ReplyActionsProviderProps {
  phone: string;
  lessons: readonly ThreadLesson[];
  children: ReactNode;
}

/**
 * The reply notes' «تأكيد الحلقة» / «تغيير الموعد» for one chat (owner 2026-10-28): a salesperson
 * (self.sales) gets her sheet and route, the admin tree the admin's, a teacher none. One sheet for the
 * chat; a move is remembered per chat (the family's moved lesson leaves the list, the note says so).
 */
export function ReplyActionsProvider({ phone, lessons, children }: ReplyActionsProviderProps) {
  const teacher = useThreadMode().kind === 'teacher';
  const sales = useHolds('self.sales');
  const can = usePermissions();
  const client = useQueryClient();
  const [move, setMove] = useState<ReplyMove | null>(null);
  const moved = useQuery({ queryKey: replyMovedKey(phone), queryFn: () => [] as string[], initialData: [] as string[], staleTime: Infinity, gcTime: Infinity });
  const flow = teacher ? null : sales ? 'sales' : 'admin';
  const { reschedule, confirm } = replyRights(can, flow);
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
    void client.invalidateQueries({ queryKey: threadKey(phone) });
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
