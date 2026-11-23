import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import {
  AppText,
  Button,
  ErrorLine,
  MoveReason,
  Note,
  RescheduleFrame,
  SlotPicker,
  t,
  type,
  useClockCycle,
  useSlotWeek,
  useTheme,
  whenText,
} from '@ab/mobile-kit';
import { useFamilySlots } from '#/portal/index.ts';

interface AskTimeSheetProps {
  lesson: PortalLesson;
  student: PortalStudent;
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (ask: { startsAt: string; note: string }) => void;
}

/**
 * «اطلب موعدًا آخر» (canvas LessonXReschedule): the staff move sheet's frame and slot picker on
 * the student's clock — the teacher's free starts of a week — a note for the academy, and «أرسل
 * الطلب». The lesson keeps its time until the academy answers.
 */
export function AskTimeSheet(props: AskTimeSheetProps) {
  return (
    <RescheduleFrame open={props.open} onClose={props.onClose} title={t.portal.actions.request}>
      {props.open ? <AskTimeBody {...props} /> : null}
    </RescheduleFrame>
  );
}

type BodyProps = Pick<AskTimeSheetProps, 'lesson' | 'student' | 'busy' | 'error' | 'onSend'>;

function AskTimeBody({ lesson, student, busy, error, onSend }: BodyProps) {
  const { color } = useTheme();
  const viewer = { tz: student.tz, cycle: useClockCycle() };
  const week = useSlotWeek(lesson.starts_at);
  const ids = { studentId: student.id, lessonId: lesson.id };
  const slots = useFamilySlots({ ...ids, from: week.from, to: week.to });
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const A = t.portal.actions;
  const current = A.currentWhen.replace('{when}', whenText(lesson.starts_at, student.tz, viewer));
  const send = () => (startsAt ? onSend({ startsAt, note: note.trim() }) : undefined);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[700], color: color.ink }}>{student.name}</AppText>
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{current}</AppText>
      </View>
      <SlotPicker
        week={week}
        slots={slots}
        tz={student.tz}
        viewer={viewer}
        value={startsAt}
        onPick={setStartsAt}
      />
      <MoveReason value={note} onChange={setNote} label={A.noteLabel} hint={null} />
      <Note>{A.staysNote}</Note>
      {error ? <ErrorLine message={error} /> : null}
      <Button label={A.send} onPress={send} disabled={busy || startsAt === null} />
    </View>
  );
}
