import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom/links/use-join-classroom';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import type { TodayLesson } from '@/today/lib/today-lesson';
import { heroPrimary } from './hero-primary';

interface HeroActionsProps {
  lesson: TodayLesson;
  running: boolean;
  busy: boolean;
  /** Absent means read-only sales (docs/16): no confirm, join only while it runs. */
  onConfirm?: () => void;
  onDetails: () => void;
}

/** One ButtonRow of equal cells (docs/29 §3, docs/07 §6), details always secondary. */
export function HeroActions({ lesson, running, busy, onConfirm, onDetails }: HeroActionsProps) {
  const join = useJoinClassroom(lesson);
  const { required } = useLessonStatusText();
  const joinOpen = join.win?.state === 'open';
  const readOnly = onConfirm === undefined;
  const primary = heroPrimary(lesson, { running, readOnly, joinOpen, required });
  return (
    <View style={{ gap: 4 }}>
      <ButtonRow testID="hero-actions">
        {primary === 'confirm' && onConfirm ? <Button label={t.today.confirmLesson} onPress={onConfirm} busy={busy} /> : null}
        {primary === 'join' ? (
          <Button
            label={join.busy ? t.classroom.joining : t.classroom.enter}
            onPress={() => void join.join()}
            busy={join.busy}
          />
        ) : null}
        <Button variant="secondary" label={t.today.details} onPress={onDetails} />
      </ButtonRow>
      {primary === 'join' && join.error ? <ErrorLine message={join.error} /> : null}
    </View>
  );
}
