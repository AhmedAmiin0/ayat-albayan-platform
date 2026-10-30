import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom/links/use-join-classroom';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import type { TodayLesson } from '../lib/today-lesson';
import { heroPrimary } from './hero-primary';

interface HeroActionsProps {
  lesson: TodayLesson;
  /** The lesson is under way (the hero's «جارية الآن»). */
  running: boolean;
  busy: boolean;
  /** None: read-only, the salesperson (docs/16): no «تأكيد», «ادخل الحلقة» only while it runs. */
  onConfirm?: () => void;
  onDetails: () => void;
}

/**
 * The hero's two buttons (docs/29 §3, docs/07 §6 «الأزرار»): ONE ButtonRow of equal cells, the filled
 * one (heroPrimary) at the reading start, then «التفاصيل» (the sheet, secondary) always.
 */
export function HeroActions({ lesson, running, busy, onConfirm, onDetails }: HeroActionsProps) {
  const join = useJoinClassroom(lesson);
  const primary = heroPrimary(lesson, { running, readOnly: onConfirm === undefined, joinOpen: join.win?.state === 'open' });
  return (
    <View style={{ gap: 4 }}>
      <ButtonRow testID="hero-actions">
        {primary === 'confirm' && onConfirm ? <Button label={t.today.confirmLesson} onPress={onConfirm} busy={busy} /> : null}
        {primary === 'join' ? (
          <Button label={join.busy ? t.classroom.joining : t.classroom.enter} onPress={() => void join.join()} busy={join.busy} />
        ) : null}
        <Button variant="secondary" label={t.today.details} onPress={onDetails} />
      </ButtonRow>
      {primary === 'join' && join.error ? <ErrorLine message={join.error} /> : null}
    </View>
  );
}
