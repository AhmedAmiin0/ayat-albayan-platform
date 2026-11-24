import type { LessonView } from '@ab/schedule';
import { HeroCard } from '@/today/hero/HeroCard';
import type { TodaySource } from '@/today/lib/today-source';
import { useDayLessons } from '@/today/lib/use-day-lessons';
import { useLessonAction } from '@/today/lib/use-lesson-action';
import { AdminLessonSheet } from './AdminLessonSheet';
import { TodayLayout } from './TodayLayout';
import { FamilyRequests } from '@/today/requests/FamilyRequests';

/** Every teacher's lessons from GET /lessons/day. */
const ADMIN_DAY: TodaySource<LessonView> = { tree: 'admin', useDay: useDayLessons, schedule: '/schedule' };

/** Admin today (R-MOB-02, docs/29); confirm and cancel are optimistic (R-MOB-03). */
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
