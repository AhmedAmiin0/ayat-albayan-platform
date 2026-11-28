import type { LessonView } from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, type, useTheme, AppText, ErrorLine, whenText } from '@ab/mobile-kit';
import { MoveFields } from './MoveFields';
import { MoveReason } from '@ab/mobile-kit';
import { useReschedule } from './queries';
import { familyTz, lessonDuration, type Scope } from './reschedule-body';
import { RescheduleDone } from './RescheduleDone';

const namesOf = (lesson: LessonView) =>
  lesson.students.map((s) => s.name).join(t.common.listSeparator);

export interface RescheduleFormProps {
  lesson: LessonView;
  onClose: () => void;
  /** Falls back to onClose when absent. */
  onDone?: (() => void) | undefined;
}

/** Reschedule (R-SCH-07, journey 4). */
export function RescheduleForm({ lesson, onClose, onDone }: RescheduleFormProps) {
  const tz = familyTz(lesson);
  const durationMin = lessonDuration(lesson);
  const move = useReschedule(lesson.id);
  const [scope, setScope] = useState<Scope>('one');
  const [reason, setReason] = useState('');
  // docs/47: only a one-lesson move carries a reason.
  const field = scope === 'one' ? <MoveReason value={reason} onChange={setReason} /> : null;

  if (move.data)
    return <RescheduleDone moved={move.data} scope={scope} tz={tz} onClose={onDone ?? onClose} />;
  return (
    <View style={{ gap: 16 }}>
      <RescheduleHeading names={namesOf(lesson)} startsAt={lesson.starts_at} tz={tz} />
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
          reason={{ text: reason, field }}
        />
      )}
    </View>
  );
}

/** Current time in the family's zone. */
export function RescheduleHeading({
  names,
  startsAt,
  tz,
}: {
  names: string;
  startsAt: string;
  tz: string;
}) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const viewerZone = useViewerTz();
  const viewer = { tz: viewerZone, cycle };
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
  return (
    <View style={{ gap: 2 }}>
      <AppText
        style={{ ...text, fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}
      >
        {names}
      </AppText>
      <AppText style={text}>
        {t.reschedule.current.replace('{when}', whenText(startsAt, tz, viewer))}
      </AppText>
    </View>
  );
}
