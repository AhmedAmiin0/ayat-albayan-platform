import type { ReplyLesson, SalesScheduleLesson, SalesScheduleDay } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { offPathKeys } from '@ab/client-core';
import { chatDayKey, RIYADH_TZ } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@ab/mobile-kit';

const MINUTE_MS = 60_000;

/** Sales: GET /sales/schedule of the lesson's Riyadh day (self.sales_academy), picked by id. */
export function useSalesReplyLesson(lesson: ReplyLesson) {
  return useQuery({
    queryKey: offPathKeys.replyLesson('sales', lesson.id),
    queryFn: async (): Promise<SalesScheduleLesson | null> => {
      // academy day (docs/34 b): a reply is about a lesson of the same academy day.
      const date = chatDayKey(new Date(lesson.starts_at), RIYADH_TZ);
      const day = await apiFetch<SalesScheduleDay>(`/sales/schedule${toQueryString({ date })}`);
      return day.lessons.find((l) => l.id === lesson.id) ?? null;
    },
    staleTime: 0,
  });
}

/** The admin: GET /lessons over the minute it starts (lessons.read), picked by id. */
export function useAdminReplyLesson(lesson: ReplyLesson) {
  return useQuery({
    queryKey: offPathKeys.replyLesson('admin', lesson.id),
    queryFn: async (): Promise<LessonView | null> => {
      const start = Date.parse(lesson.starts_at);
      const window = { from: new Date(start).toISOString(), to: new Date(start + MINUTE_MS).toISOString() };
      const rows = await apiFetch<LessonView[]>(`/lessons${toQueryString(window)}`);
      return rows.find((l) => l.id === lesson.id) ?? null;
    },
    staleTime: 0,
  });
}
