import type { RoomPresence } from '@ab/schedule';
import { t } from '../../../lib/i18n/i18n';

export const teacherIn = (presence: readonly RoomPresence[]): string | null =>
  presence.some((p) => p.role === 'teacher') ? t.portal.app.live.teacherIn : null;
