import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom/links/use-join-classroom';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import type { TodayLesson } from '../lib/today-lesson';
import { HeroButton } from './HeroButton';
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

/** The hero's two buttons (docs/29 §3): the filled one (heroPrimary), then «التفاصيل» (the sheet) always. */
export function HeroActions({ lesson, running, busy, onConfirm, onDetails }: HeroActionsProps) {
  const join = useJoinClassroom(lesson);
  const primary = heroPrimary(lesson, { running, readOnly: onConfirm === undefined, joinOpen: join.win?.state === 'open' });
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {primary === 'confirm' && onConfirm ? <HeroButton primary label={t.today.confirmLesson} onPress={onConfirm} busy={busy} /> : null}
        {primary === 'join' ? (
          <HeroButton primary label={join.busy ? t.classroom.joining : t.classroom.enter} onPress={() => void join.join()} busy={join.busy} />
        ) : null}
        <HeroButton label={t.today.details} onPress={onDetails} />
      </View>
      {primary === 'join' && join.error ? <ErrorLine message={join.error} /> : null}
    </View>
  );
}
