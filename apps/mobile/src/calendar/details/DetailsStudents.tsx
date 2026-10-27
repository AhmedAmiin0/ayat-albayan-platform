import { router } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';
import { useNow } from '@/core/lib/time/use-now';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { DetailsGroup } from './DetailsGroup';
import { DetailsStudentRow } from './DetailsStudentRow';
import {
  reportHref,
  reportState,
  type DetailsLesson,
  type DetailsRole,
  type ReportState,
} from './details-text';

const TEACHER_LABEL: Record<ReportState, string> = {
  none: t.reports.open,
  draft: t.reports.resume,
  submitted: t.reports.view,
};

/** The teacher's one report form holds every student: «اكتب التقرير» until all are sent, then «عرض التقرير». */
function teacherReport(lesson: DetailsLesson, now: Date): ReportState | null {
  const states = lesson.students.map((s) => reportState(lesson, s, now));
  if (states.length === 0 || states.some((s) => s === null)) return null;
  if (states.every((s) => s === 'submitted')) return 'submitted';
  return states.includes('draft') ? 'draft' : 'none';
}

/** «الطلاب»: one row per student, hairlines between them, and the teacher's report button under them. */
interface DetailsStudentsProps {
  lesson: DetailsLesson;
  role: DetailsRole;
  /** Closes the sheet before a tap navigates (the next screen would open under the modal). */
  onLeave: () => void;
}

export function DetailsStudents({ lesson, role, onLeave }: DetailsStudentsProps) {
  const { color } = useTheme();
  const now = useNow();
  const mine = role === 'teacher' ? teacherReport(lesson, now) : null;
  const first = lesson.students[0];
  const href = mine && first ? reportHref(role, lesson, first) : null;
  return (
    <DetailsGroup label={t.schedule.students}>
      {lesson.students.map((student, i) => (
        <Fragment key={student.id}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: color.rule }} /> : null}
          <DetailsStudentRow lesson={lesson} student={student} role={role} onLeave={onLeave} />
        </Fragment>
      ))}
      {mine && href ? (
        <View style={{ alignSelf: 'flex-start', paddingTop: 4 }}>
          <Button
            variant={mine === 'submitted' ? 'ghost' : 'secondary'}
            label={TEACHER_LABEL[mine]}
            onPress={() => {
              onLeave();
              router.push(href);
            }}
          />
        </View>
      ) : null}
    </DetailsGroup>
  );
}
