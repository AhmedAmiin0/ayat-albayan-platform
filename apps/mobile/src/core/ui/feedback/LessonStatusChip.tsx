import type { LessonStatus } from '@ab/shared';
import { useLessonStatusText } from './lesson-status';
import { StatusChip, type StatusChipProps } from './StatusChip';

interface LessonStatusChipProps {
  status: LessonStatus;
  size?: StatusChipProps['size'];
  /** The whole word («يحتاج تأكيد» / «مجدولة») where there is room; else a row's short word. */
  full?: boolean;
}

/**
 * A lesson's status chip, following settings.lesson_confirmation_required: OFF, a scheduled lesson
 * reads «قادمة» / «مجدولة» in the neutral look (owner 2026-11-02), never «يحتاج تأكيد».
 */
export function LessonStatusChip({ status, size, full = false }: LessonStatusChipProps) {
  const text = useLessonStatusText();
  const label = full ? text.label(status) : text.word(status);
  return <StatusChip {...text.look(status)} label={label} size={size} />;
}
