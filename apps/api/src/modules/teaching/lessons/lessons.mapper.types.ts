import type { Role } from '@/common/auth/verify-token';
import type { SeqMap } from './lessons.repo';

/**
 * academyAuto: settings.meeting_link_auto, the default of a teacher whose meeting_mode is null
 * (false when absent); reportMinutes and now: the report edit window (docs/46 B7, readerWindow).
 */
export interface ViewContext {
  role: Role | null;
  seq: SeqMap;
  academyAuto?: boolean;
  reportMinutes?: number;
  now?: Date;
}
