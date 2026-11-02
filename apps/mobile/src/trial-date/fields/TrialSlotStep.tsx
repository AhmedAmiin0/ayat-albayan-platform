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

/**
 * «الموعد» of «موعد تجريبي جديد»: «مدة الحلقة» (the last trial's, changeable; owner 2026-11-02)
 * over the booking's slot grid for that length.
 */
export function TrialSlotStep({ onLength, ...slots }: TrialSlotStepProps) {
  return (
    <View style={{ gap: 16 }}>
      <DurationPills value={slots.durationMin} onChange={onLength} />
      <SlotStep {...slots} />
    </View>
  );
}
