import type { LessonView } from '@ab/schedule';
import { View } from 'react-native';
import { t, StatusChip, Button, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { TeacherCancelForm } from './TeacherCancelForm';
import { useTeacherActs, type TeacherActs } from './use-teacher-acts';

const w = t.teacherBoard;

/** Shown only while the lesson is still ahead. */
function ConfirmedChip({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <StatusChip tone="ok" glyph="fill" label={w.confirmedChip} size="sm" />
    </View>
  );
}

/** Outlined, since the sheet's filled button is the classroom. */
function ToolButtons({ acts }: { acts: TeacherActs }) {
  return (
    <ButtonRow testID="teacher-lesson-tools">
      {acts.canConfirm ? (
        <Button variant="secondary" label={w.confirm} onPress={acts.confirm} busy={acts.busy} />
      ) : null}
      {acts.canCancel ? (
        <Button variant="danger" label={w.cancel} onPress={acts.openCancel} />
      ) : null}
    </ButtonRow>
  );
}

interface TeacherLessonToolsProps {
  lesson: LessonView;
  /** The screen's notice outlives the sheet (docs/48). */
  onDone: (text: string) => void;
}

/** Her own actions (docs/46 C7, C4, C3); cancel needs a reason. */
export function TeacherLessonTools({ lesson, onDone }: TeacherLessonToolsProps) {
  const acts = useTeacherActs(lesson, onDone);
  return (
    <View style={{ gap: 8 }}>
      <ConfirmedChip on={acts.confirmed} />
      {acts.error ? <ErrorLine message={acts.error} /> : null}
      {acts.cancelling ? (
        <TeacherCancelForm
          lessonId={lesson.id}
          onClose={acts.closeCancel}
          onDone={acts.cancelDone}
        />
      ) : (
        <ToolButtons acts={acts} />
      )}
    </View>
  );
}
