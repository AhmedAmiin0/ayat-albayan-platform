import { canRemove, type JoinRole } from '@ab/shared';
import { useCallback, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { classroomErrorText } from '../room/livekit/errors';
import { removeParticipant } from '../api/moderation-api';
import type { TileView } from '../room/components/room-types';

export interface KickToast {
  message: string;
  tone: 'info' | 'error';
}

export interface KickController {
  /** «إخراج من الحلقة» is offered on this tile (never on yourself, never without the lesson id). */
  canKick: (tile: TileView) => boolean;
  target: TileView | null;
  ask: (tile: TileView) => void;
  cancel: () => void;
  confirm: () => void;
  busy: boolean;
  toast: KickToast | null;
  dismiss: () => void;
}

export interface KickOptions {
  /** The lesson (or internal meeting, with its own `remove`) whose room this is; null: no «إخراج». */
  lessonId: string | null;
  role: JoinRole;
  /** Test seam: the API call. */
  remove?: typeof removeParticipant;
}

/**
 * Ask → confirm → POST remove. On success the tile goes away by itself (LiveKit
 * ParticipantDisconnected); 403 / 404 come back as their classroom.error words in a toast.
 */
export function useKick({ lessonId, role, remove = removeParticipant }: KickOptions): KickController {
  const [target, setTarget] = useState<TileView | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<KickToast | null>(null);

  const canKick = useCallback(
    (tile: TileView) => lessonId !== null && !tile.isLocal && tile.kind === 'camera' && tile.role !== null && canRemove(role, tile.role),
    [lessonId, role],
  );

  const confirm = () => {
    if (!target || lessonId === null) return;
    const who = target;
    setBusy(true);
    remove({ lessonId, identity: who.identity })
      .then(() => setToast({ message: t.classroom.kick.done.replace('{name}', who.name), tone: 'info' }))
      .catch((error: unknown) => setToast({ message: classroomErrorText(error), tone: 'error' }))
      .finally(() => {
        setBusy(false);
        setTarget(null);
      });
  };

  return {
    canKick,
    target,
    ask: (tile) => {
      setToast(null);
      setTarget(tile);
    },
    cancel: () => setTarget(null),
    confirm,
    busy,
    toast,
    dismiss: () => setToast(null),
  };
}
