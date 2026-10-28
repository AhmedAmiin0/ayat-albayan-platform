import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { useCoursePause } from './course-pause-api';
import { CoursePauseBanner } from './CoursePauseBanner';
import { CoursePauseForm } from './CoursePauseForm';
import { PauseSheetFrame } from './PauseSheetFrame';

/**
 * «إيقاف مؤقت» in the admin's student file and sales' «تفاصيل الطالب» (owner 2026-10-28), ANY student: the
 * banner while a pause is open, else the action (courses.pause) that opens «إيقاف الدورة مؤقتًا». Nothing
 * until GET …/course-pause answers (or when it fails). The family gets no message; the sheet says so.
 */
export function CoursePauseSection({ studentId }: { studentId: string }) {
  const state = useCoursePause(studentId);
  const holds = useHolds('courses.pause');
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const c = t.coursePause;
  if (!state.data) return null;
  const open = state.data.open;
  if (!open && !holds && notice === null) return null;
  return (
    <View style={{ gap: 8 }}>
      {notice ? <Note>{notice}</Note> : null}
      {open ? <CoursePauseBanner studentId={studentId} pause={open} canChange={holds} onNotice={setNotice} /> : null}
      {!open && holds ? (
        <Button
          variant="secondary"
          label={c.action}
          onPress={() => {
            setNotice(null);
            setStarting(true);
          }}
        />
      ) : null}
      <PauseSheetFrame open={starting} title={c.title} onClose={() => setStarting(false)}>
        <CoursePauseForm
          studentId={studentId}
          onClose={() => setStarting(false)}
          onDone={() => {
            setStarting(false);
            setNotice(c.done);
          }}
        />
      </PauseSheetFrame>
    </View>
  );
}
