import { useState } from 'react';
import { View } from 'react-native';
import { useHolds, t } from '@ab/mobile-kit';
import { Note } from '@/more';
import { ActionRow } from '@/students/course-card/ActionRow';
import { useCoursePause } from './course-pause-api';
import { CoursePauseBanner } from './CoursePauseBanner';
import { CoursePauseForm } from './CoursePauseForm';
import { PauseSheetFrame } from './PauseSheetFrame';

/** Any student; nothing until the pause state answers or when it fails; no family message. */
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
      {open ? (
        <CoursePauseBanner
          studentId={studentId}
          pause={open}
          canChange={holds}
          onNotice={setNotice}
        />
      ) : null}
      {!open && holds ? (
        <ActionRow
          title={c.action}
          hint={t.courseCard.hints.pause}
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
