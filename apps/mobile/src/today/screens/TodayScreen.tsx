import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { LessonDetailsSheet } from '@/calendar/details/LessonDetailsSheet';
import { LessonRowActions } from '@/calendar/agenda/LessonRowActions';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton';
import { EditTimeSheet } from '@/edit-time/components/EditTimeSheet';
import { RescheduleSheet } from '@/teaching/reschedule/RescheduleSheet';
import { HeroCard } from '../hero/HeroCard';
import type { TodaySource } from '../lib/today-source';
import { useDayLessons } from '../lib/use-day-lessons';
import { useLessonAction } from '../lib/use-lesson-action';
import { TodayLayout } from './TodayLayout';

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
  const [moving, setMoving] = useState<LessonView | null>(null);
  const [editing, setEditing] = useState<LessonView | null>(null);
  return (
    <TodayLayout
      source={ADMIN_DAY}
      notice={action.notice}
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
        <LessonDetailsSheet
          lesson={details.lesson}
          role="admin"
          onClose={details.close}
          actions={(lesson) => (
            <>
              <LessonRowActions lesson={lesson} action={action} onReschedule={setMoving} onEditTime={setEditing} onLeave={details.close} />
              <JoinClassroomButton lesson={lesson} />
            </>
          )}
          sheets={
            <>
              <RescheduleSheet lesson={moving} onClose={() => setMoving(null)} />
              <EditTimeSheet lesson={editing} onClose={() => setEditing(null)} />
            </>
          }
        />
      )}
    />
  );
}
