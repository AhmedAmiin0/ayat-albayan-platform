import { reportStage, type ReportStage } from '@ab/client-core';
import { pushInTab } from '@/core/nav/back-within';
import { Fragment } from 'react';
import { View } from 'react-native';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { DetailsGroup } from './DetailsGroup';
import { DetailsStudentRow } from './DetailsStudentRow';
import { reportHref, type DetailsLesson, type DetailsRole } from './details-text';

/** The teacher's one report form holds every student: its stage across them (docs/48). */
const TEACHER_LABEL: Record<ReportStage, string> = {
  write: t.reports.open,
  resume: t.reports.resume,
  window: t.reports.view,
  done: t.reports.view,
};

/** Her report stage once the lesson started (none before, or on a closed lesson, or no student). */
const teacherStage = (lesson: DetailsLesson, now: Date): ReportStage | null =>
  lesson.students.length > 0 ? reportStage(lesson, now) : null;

type OnReport = ((lessonId: string) => void) | undefined;

/** «الطلاب»: one row per student, hairlines between them, and the teacher's report button under them. */
interface DetailsStudentsProps {
  lesson: DetailsLesson;
  role: DetailsRole;
  /** Closes the sheet before a tap navigates (the next screen would open under the modal). */
  onLeave: () => void;
  /** The student whose file opened the sheet: no link back to it. */
  hereStudentId?: string | undefined;
  /** Where the teacher's report button goes (LessonDetailsSheet.onReport); else the reports tab. */
  onReport?: OnReport;
}

/** The press: the caller's own target, else today's reportHref in the current tab. */
const goReport = (p: { lessonId: string; href: string; onReport: OnReport }) =>
  p.onReport ? p.onReport(p.lessonId) : pushInTab(p.href);

export function DetailsStudents(props: DetailsStudentsProps) {
  const { lesson, role, onLeave, hereStudentId, onReport } = props;
  const { color } = useTheme();
  const now = useNow();
  const mine = role === 'teacher' ? teacherStage(lesson, now) : null;
  const first = lesson.students[0];
  const href = mine && first ? reportHref(role, lesson, first) : null;
  return (
    <DetailsGroup label={t.schedule.students}>
      {lesson.students.map((student, i) => (
        <Fragment key={student.id}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: color.rule }} /> : null}
          <DetailsStudentRow
            lesson={lesson}
            student={student}
            role={role}
            onLeave={onLeave}
            here={student.id === hereStudentId}
          />
        </Fragment>
      ))}
      {mine && href ? (
        <View style={{ paddingTop: 4 }}>
          <Button
            variant="secondary"
            label={TEACHER_LABEL[mine]}
            onPress={() => {
              onLeave();
              goReport({ lessonId: lesson.id, href, onReport });
            }}
          />
        </View>
      ) : null}
    </DetailsGroup>
  );
}
