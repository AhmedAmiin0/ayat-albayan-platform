import type { LessonView } from '@ab/schedule';
import { InsetGroup } from '@ab/mobile-kit';
import { TeacherLessonRow } from '@/teacher/lessons/TeacherLessonRow';
import { EndedFold } from '@/today';
import type { RowHandlers } from './TodayRest';

/** Ended rows show the report lead only, never a join (docs/48). */
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
