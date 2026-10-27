import type { LessonView } from '@ab/shared';

/**
 * What «اليوم» reads of a lesson (docs/29): the admin's LessonView (GET /lessons/day), or the
 * salesperson's narrower schedule lesson (GET /sales/schedule: no confirm events, no reasons). A
 * student's or teacher's zone may be absent in an old sales cache.
 */
export type TodayLesson = Pick<LessonView, 'id' | 'starts_at' | 'ends_at' | 'status'> &
  Partial<Pick<LessonView, 'trial' | 'makeup' | 'allowed_events' | 'room_opened_at'>> & {
    teacher: { display_name_ar: string; display_name_en?: string | null; tz?: string };
    students: { id: string; code: string; name: string; tz?: string }[];
  };
