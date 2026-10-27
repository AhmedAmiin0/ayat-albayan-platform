import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { whenText } from '@/booking/shared/slots';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { studentNames } from '@/today/lib/lesson-text';
import { AppText } from '@/core/ui/primitives/AppText';
import { MoveFields } from './MoveFields';
import { useReschedule } from './queries';
import { familyTz, lessonDuration, type Scope } from './reschedule-body';
import { RescheduleDone } from './RescheduleDone';

export interface RescheduleFormProps {
  lesson: LessonView;
  onClose: () => void;
}

/**
 * «تغيير ميعاد الحلقة» (R-SCH-07, journey 4): who and when now, then the move (MoveFields); once
 * the API answers, the new time and the guardian's confirmation (RescheduleDone).
 */
export function RescheduleForm({ lesson, onClose }: RescheduleFormProps) {
  const tz = familyTz(lesson);
  const durationMin = lessonDuration(lesson);
  const move = useReschedule(lesson.id);
  const [scope, setScope] = useState<Scope>('one');

  if (move.data) return <RescheduleDone moved={move.data} scope={scope} tz={tz} onClose={onClose} />;
  return (
    <View style={{ gap: 16 }}>
      <RescheduleHeading names={studentNames(lesson)} startsAt={lesson.starts_at} tz={tz} />
      {durationMin === null ? (
        <ErrorLine message={t.reschedule.badDuration} />
      ) : (
        <MoveFields
          lesson={lesson}
          durationMin={durationMin}
          tz={tz}
          move={move}
          scope={scope}
          onScope={setScope}
        />
      )}
    </View>
  );
}

/** Who and when now, over the move: «يوسف أحمد» then «الموعد الحالي: …» in the family's zone. */
export function RescheduleHeading({ names, startsAt, tz }: { names: string; startsAt: string; tz: string }) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 2 }}>
      <AppText style={{ ...text, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>{names}</AppText>
      <AppText style={text}>{t.reschedule.current.replace('{when}', whenText(startsAt, tz))}</AppText>
    </View>
  );
}
