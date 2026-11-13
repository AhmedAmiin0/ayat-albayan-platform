import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Button } from '@/core/ui/primitives/Button';
import { TeacherCancelForm } from './TeacherCancelForm';
import { useTeacherActs, type TeacherActs } from './use-teacher-acts';

const w = t.teacherBoard;

/** «حضورك مؤكَّد» once she said she will attend (the lesson still ahead). */
function ConfirmedChip({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <StatusChip tone="ok" glyph="fill" label={w.confirmedChip} size="sm" />
    </View>
  );
}

/** «سأحضر» (outlined: the sheet's filled button is the classroom) and «إلغاء الحلقة» (danger). */
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
  /** Says what landed («سأحضر», a cancel): the screen's notice outlives the sheet (docs/48). */
  onDone: (text: string) => void;
}

/**
 * The teacher's own actions in «تفاصيل الحلقة» of «جدولي» (docs/46 C7): «سأحضر» (C4) or its chip,
 * «إلغاء الحلقة» (C3) with the required reason, each its own mutation; onDone once one lands.
 */
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
