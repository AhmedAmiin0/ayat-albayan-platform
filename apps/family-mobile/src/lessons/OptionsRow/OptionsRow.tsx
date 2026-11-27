import { LessonOptions } from '@/lessons/options/LessonOptions';
import type { OptionsRowProps } from './OptionsRow.types';
import { RowBody } from './RowBody';
import { useOptionsRow } from './use-options-row';

/** A lesson without options is plain text; otherwise its words open the lesson options. */
export function OptionsRow({ lesson, student, clock, now, children }: OptionsRowProps) {
  const { notice, setNotice, label, title } = useOptionsRow({ lesson, clock, now });
  return (
    <LessonOptions lesson={lesson} student={student} now={now} title={title} onNotice={setNotice}>
      {(open) => (
        <RowBody open={open} label={label} notice={notice}>
          {children}
        </RowBody>
      )}
    </LessonOptions>
  );
}
