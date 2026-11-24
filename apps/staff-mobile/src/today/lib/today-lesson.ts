import type { LessonView } from '@ab/shared';

/** Admin LessonView or the narrower sales lesson; zones may be absent in an old sales cache. */
export type TodayLesson = Pick<LessonView, 'id' | 'starts_at' | 'ends_at' | 'status'> &
  Partial<Pick<LessonView, 'trial' | 'makeup' | 'allowed_events' | 'room_opened_at'>> & {
    teacher: { display_name_ar: string; display_name_en?: string | null; tz?: string };
    students: { id: string; code: string; name: string; tz?: string }[];
  };
