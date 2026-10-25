import { canMute, canMuteAll, type JoinRole, type MuteSource } from '@ab/shared';
import { useCallback, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { classroomErrorText } from '../room/livekit/errors';
import type { TileView } from '../room/components/room-types';
import type { MuteCall } from './mute-api';

export interface MuteToast {
  message: string;
  tone: 'info' | 'error';
}

export interface MuteController {
  /** «كتم الميكروفون» / «إيقاف الكاميرا» is offered: someone else, below me, with that source on. */
  canMute: (tile: TileView, source: MuteSource) => boolean;
  /** «كتم الجميع»: the teacher or an admin, with at least one guest's microphone on. */
  canMuteAll: boolean;
  mute: (tile: TileView, source: MuteSource) => void;
  muteAll: () => void;
  toast: MuteToast | null;
  dismiss: () => void;
}

export interface MuteOptions {
  role: JoinRole;
  tiles: TileView[];
  /** The API call (null: a room with no such route, no mute actions). */
  call: MuteCall | null;
}

const isOn = (tile: TileView, source: MuteSource): boolean => (source === 'microphone' ? tile.micOn : tile.hasVideo);
const DONE: Record<MuteSource, string> = { microphone: t.classroom.mute.micDone, camera: t.classroom.mute.camDone };

/**
 * Staff mute someone's track server-side (no confirm: they can turn it back on). The tile updates
 * by itself (LiveKit TrackMuted); a refusal comes back as its classroom.error words in a toast.
 */
export function useMute({ role, tiles, call }: MuteOptions): MuteController {
  const [toast, setToast] = useState<MuteToast | null>(null);
  const may = useCallback(
    (tile: TileView, source: MuteSource) =>
      call !== null && !tile.isLocal && tile.kind === 'camera' && canMute(role, tile.role) && isOn(tile, source),
    [call, role],
  );
  const guestsOn = tiles.filter((x) => x.role === 'guest' && may(x, 'microphone'));
  const fail = (error: unknown) => setToast({ message: classroomErrorText(error), tone: 'error' });

  const mute = (tile: TileView, source: MuteSource) => {
    if (!call || !may(tile, source)) return;
    call({ identity: tile.identity, source })
      .then(() => setToast({ message: DONE[source].replace('{name}', tile.name), tone: 'info' }))
      .catch(fail);
  };

  const muteAll = () => {
    if (!call) return;
    const calls = guestsOn.map((x) => call({ identity: x.identity, source: 'microphone' }));
    void Promise.allSettled(calls).then((results) => {
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) fail(failed.reason);
      else setToast({ message: t.classroom.mute.allDone, tone: 'info' });
    });
  };

  return {
    canMute: may,
    canMuteAll: canMuteAll(role) && guestsOn.length > 0,
    mute,
    muteAll,
    toast,
    dismiss: () => setToast(null),
  };
}
