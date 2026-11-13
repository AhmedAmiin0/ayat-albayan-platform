import type { LessonView } from '@ab/shared';
import { InsetGroup } from '@/core/ui/surface/inset';
import { TeacherLessonRow } from '@/teacher/lessons/TeacherLessonRow';
import { EndedFold } from '@/today';
import type { RowHandlers } from './TodayRest';

/** «انتهت n حلقات اليوم» (docs/48): her ended rows unfold, the word only, no join, no lead. */
export function TodayEnded({ lessons, rows }: { lessons: LessonView[]; rows: RowHandlers }) {
  return (
    <EndedFold
      lessons={lessons}
      onOpen={rows.onOpen}
      rows={
        <InsetGroup>
          {lessons.map((l) => (
            <TeacherLessonRow key={l.id} lesson={l} {...rows} quiet />
          ))}
        </InsetGroup>
      }
    />
  );
}
