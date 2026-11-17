import type { LessonView } from '@ab/shared';
import { HeroCard } from '@/today/hero/HeroCard';
import type { TodaySource } from '@/today/lib/today-source';
import { useDayLessons } from '@/today/lib/use-day-lessons';
import { useLessonAction } from '@/today/lib/use-lesson-action';
import { AdminLessonSheet } from './AdminLessonSheet';
import { TodayLayout } from './TodayLayout';
import { FamilyRequests } from '@/today/requests/FamilyRequests';

/** The admin's day: GET /lessons/day, every teacher; «جدول الغد» to «الجدول». */
const ADMIN_DAY: TodaySource<LessonView> = { tree: 'admin', useDay: useDayLessons, schedule: '/schedule' };

/**
 * «اليوم» (R-MOB-02, docs/29): the calm landing of the admin (TodayLayout). A tap on any lesson opens
 * «تفاصيل الحلقة», where its actions live: تأكيد / إلغاء (optimistic, R-MOB-03), «غيّر الميعاد»
 * (R-SCH-07), «عدّل الوقت» (R-SCH-11, on an ended lesson too), «حجز تعويضي» and «ادخل الحلقة»; the
 * hero confirms in place.
 */
export function TodayScreen() {
  const action = useLessonAction();
  return (
    <TodayLayout
      source={ADMIN_DAY}
      notice={action.notice}
      requests={<FamilyRequests />}
      hero={(hero, onDetails) => (
        <HeroCard
          hero={hero}
          busy={action.busyId === hero.lesson.id}
          error={action.errorFor(hero.lesson.id)}
          onConfirm={() => action.confirm(hero.lesson.id)}
          onDetails={onDetails}
        />
      )}
      sheet={(details) => (
        <AdminLessonSheet lesson={details.lesson} onClose={details.close} action={action} />
      )}
    />
  );
}
