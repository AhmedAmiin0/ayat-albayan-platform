import type { RoomJoinResult } from '@ab/shared';
import { createPortal } from 'react-dom';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface LessonRoomProps {
  join: RoomJoinResult;
  onClose: () => void;
}

/**
 * The academy's room over the whole page, outside the agenda's list. Its own «أعد الدخول» / the
 * ended screen bring the agenda back; Esc does not (it would drop a live lesson by mistake).
 */
export function LessonRoom({ join, onClose }: LessonRoomProps) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.portal.app.schedule.room}
      className="fixed inset-0 z-50 overflow-auto bg-page"
    >
      <ClassroomRoom join={join} onRejoin={onClose} />
    </div>,
    document.body,
  );
}
