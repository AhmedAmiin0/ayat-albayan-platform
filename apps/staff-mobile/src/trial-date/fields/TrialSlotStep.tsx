import type { Duration } from '@ab/shared';
import { View } from 'react-native';
import { DurationPills, SlotStep } from '@/booking';

interface TrialSlotStepProps {
  teacherId: string;
  tz: string;
  durationMin: Duration;
  /** The trial being moved: its own time is not busy. */
  excludeLessonId: string | undefined;
  /** A new length clears the picked time (the free slots depend on it). */
  onLength: (minutes: Duration) => void;
  onPick: (startsAt: string) => void;
}

/** The length defaults to the last trial's and is changeable. */
export function TrialSlotStep({ onLength, ...slots }: TrialSlotStepProps) {
  return (
    <View style={{ gap: 16 }}>
      <DurationPills value={slots.durationMin} onChange={onLength} />
      <SlotStep {...slots} />
    </View>
  );
}
