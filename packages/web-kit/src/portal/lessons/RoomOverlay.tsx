import type { RoomJoinResult } from '@ab/shared';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  join: RoomJoinResult;
  /** The room asked to be joined again (left, kicked, failed): the card comes back. */
  onRejoin: () => void;
}

/**
 * The classroom over the whole page once a lesson card admitted the student (audit 2026-11-19,
 * extraction 4): one modal surface for every card that joins — the portal's lessons, the family
 * home's next lesson, the family week.
 */
export function RoomOverlay({ join, onRejoin }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.portal.roomTitle}
      className="fixed inset-0 z-50 overflow-auto bg-page"
    >
      <ClassroomRoom join={join} onRejoin={onRejoin} />
    </div>
  );
}
