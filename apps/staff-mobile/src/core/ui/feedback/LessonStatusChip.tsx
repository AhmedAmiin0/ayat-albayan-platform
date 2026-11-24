import type { LessonStatus } from '@ab/catalog';
import { useLessonStatusText } from './lesson-status';
import { StatusChip, type StatusChipProps } from '@ab/mobile-kit';

interface LessonStatusChipProps {
  status: LessonStatus;
  size?: StatusChipProps['size'];
  /** The full word where there is room; else a row's short word. */
  full?: boolean;
}

/** With confirmation off, a scheduled lesson reads neutral, never needs-confirmation. */
export function LessonStatusChip({ status, size, full = false }: LessonStatusChipProps) {
  const text = useLessonStatusText();
  const label = full ? text.label(status) : text.word(status);
  return <StatusChip {...text.look(status)} label={label} size={size} />;
}
