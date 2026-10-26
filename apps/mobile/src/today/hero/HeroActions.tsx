import { applyLessonEvent, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom/links/use-join-classroom';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { HeroButton } from './HeroButton';

export interface HeroActionsProps {
  lesson: LessonView;
  busy: boolean;
  onConfirm: () => void;
  onDetails: () => void;
}

/**
 * The hero's two buttons (docs/29 §3): «تأكيد الحلقة» when the API offers confirm and the status on
 * screen still allows it, else «ادخل الحلقة» inside the join window, else no primary; «التفاصيل»
 * (the lesson details sheet) always.
 */
export function HeroActions({ lesson, busy, onConfirm, onDetails }: HeroActionsProps) {
  const join = useJoinClassroom(lesson);
  const canConfirm = lesson.allowed_events.includes('confirm') && applyLessonEvent(lesson.status, 'confirm') !== null;
  const canJoin = !canConfirm && join.win?.state === 'open';
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {canConfirm ? <HeroButton primary label={t.today.confirmLesson} onPress={onConfirm} busy={busy} /> : null}
        {canJoin ? (
          <HeroButton primary label={join.busy ? t.classroom.joining : t.classroom.enter} onPress={() => void join.join()} busy={join.busy} />
        ) : null}
        <HeroButton label={t.today.details} onPress={onDetails} />
      </View>
      {canJoin && join.error ? <ErrorLine message={join.error} /> : null}
    </View>
  );
}
