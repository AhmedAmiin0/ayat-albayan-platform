import type { LessonView } from '@ab/shared';
import { LessonDetailsSheet } from '@/calendar';
import { TeacherSheetActions } from './TeacherSheetActions';

interface TeacherLessonSheetProps {
  /** The open lesson (null: closed), read from the unfiltered list so a cancel still shows. */
  lesson: LessonView | null;
  onClose: () => void;
  /** The screen's notice: it outlives the sheet. */
  onNotice: (text: string) => void;
  /** Where the report button goes, inside the current tab (docs/48). */
  onReport: (lessonId: string) => void;
}

/**
 * «تفاصيل الحلقة» for the teacher (docs/48): LessonDetailsSheet role='teacher' with her actions
 * (TeacherSheetActions) and ONE report button, DetailsStudents' own, routed by onReport. A landed
 * «سأحضر» or cancel closes the sheet and the screen says it once.
 */
export function TeacherLessonSheet(p: TeacherLessonSheetProps) {
  const { lesson, onClose, onNotice, onReport } = p;
  const done = (text: string) => {
    onClose();
    onNotice(text);
  };
  return (
    <LessonDetailsSheet
      lesson={lesson}
      role="teacher"
      onClose={onClose}
      onReport={onReport}
      actions={(l) => <TeacherSheetActions lesson={l} onDone={done} />}
    />
  );
}
