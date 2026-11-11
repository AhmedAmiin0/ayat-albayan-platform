import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Button } from '@/core/ui/primitives/Button';
import { Notice } from '@/today';
import { TeacherCancelForm } from './TeacherCancelForm';
import { useTeacherActs, type TeacherActs } from './use-teacher-acts';
import type { TimedNotice } from './use-timed-notice';

const w = t.teacherBoard;

/** «حضورك مؤكَّد» once she said she will attend (the lesson still ahead). */
export function ConfirmedChip({ on }: { on: boolean }) {
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
  /** The screen's notice: it outlives a cancelled lesson's actions. */
  notice: TimedNotice;
}

/**
 * The teacher's own actions in «تفاصيل الحلقة» of «جدولي» (docs/46 C7): «سأحضر» (C4) or its chip,
 * «إلغاء الحلقة» (C3) with the required reason, each its own mutation; the notice once one lands.
 */
export function TeacherLessonTools({ lesson, notice }: TeacherLessonToolsProps) {
  const acts = useTeacherActs(lesson, notice.show);
  return (
    <View style={{ gap: 8 }}>
      {notice.text ? <Notice message={notice.text} /> : null}
      <ConfirmedChip on={acts.confirmed} />
      {acts.error ? <ErrorLine message={acts.error} /> : null}
      {acts.cancelling ? (
        <TeacherCancelForm lessonId={lesson.id} onClose={acts.closeCancel} onDone={acts.cancelDone} />
      ) : (
        <ToolButtons acts={acts} />
      )}
    </View>
  );
}
