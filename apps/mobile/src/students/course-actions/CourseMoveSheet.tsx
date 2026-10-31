import { courseMoveBase, courseMoveErrorCode, type CourseMoveKind } from '@ab/client-core';
import { useState, type ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { useIsAdmin } from '@/auth';
import { BookingModeProvider } from '@/booking';
import { t } from '@/core/lib/i18n/i18n';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { CourseChangeFlow } from '@/sales-course';
import { useMoveView, type SubRef } from './course-actions-api';
import { SheetLines } from './SheetLines';
import { TeacherStep, type TeacherPick } from './TeacherStep';

interface CourseMoveSheetProps {
  sub: SubRef;
  kind: CourseMoveKind;
  onClose: () => void;
  /** Saved: the sheet closes and the file says so. */
  onDone: () => void;
}

/**
 * «تغيير المعلم» / «تغيير موعد الحلقات» from the student's file (owner 2026-10-30): the course (GET
 * …/change), for a teacher change its new teacher first, then the assistant's «تغيير أيام الحلقات»
 * flow against the profile's route (remaining lessons, the clash check; the admin may override
 * with a reason, sales never). Slots are the admin's or the assistant's by the viewer's role.
 */
export function CourseMoveSheet({ sub, kind, onClose, onDone }: CourseMoveSheetProps) {
  const admin = useIsAdmin();
  const view = useMoveView({ ...sub, kind });
  const [teacher, setTeacher] = useState<TeacherPick | null>(null);
  const c = t.courseActions;
  const title = kind === 'teacher' ? c.teacher.title : c.times.title;
  const path = `${courseMoveBase({ studentId: sub.studentId, kind })}/change`;
  const flow = view.data && (kind === 'times' || teacher !== null) ? view.data : null;
  const step = (): ReactNode => {
    if (view.isError) return <ErrorLine message={c.errors[courseMoveErrorCode(view.error)]} />;
    if (!view.data) return <SheetLines lines={[t.common.loading]} />;
    const currentId = view.data.course.teacherId;
    return <TeacherStep studentId={sub.studentId} currentId={currentId} onPick={setTeacher} />;
  };
  const target = {
    path,
    title,
    teacherId: teacher?.teacherId,
    review: teacher?.keep,
    override: admin,
  };
  const close = <Button variant="ghost" label={t.common.close} onPress={onClose} />;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <BookingModeProvider value={admin ? 'admin' : 'sales'}>
          {flow ? (
            <CourseChangeFlow
              student={flow.student}
              course={flow.course}
              target={target}
              onLeave={() => (kind === 'teacher' ? setTeacher(null) : onClose())}
              onDone={onDone}
            />
          ) : (
            <>
              <ScreenHeader size="h2" title={title} trailing={close} />
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
              >
                {step()}
              </ScrollView>
            </>
          )}
        </BookingModeProvider>
      </Screen>
    </Modal>
  );
}
