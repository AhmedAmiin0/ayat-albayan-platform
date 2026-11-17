import {
  mayEndForAll,
  mayMuteMic,
  mayRemove,
  mayStopCam,
  muteAllTargets,
} from '@ab/client-core';
import type { JoinRole, MuteSource } from '@ab/shared';
import { useState } from 'react';
import { joinError } from '@/classroom/links/join-text';
import type { RoomTile } from '@/classroom/room/model/room-types';
import { t } from '@ab/mobile-kit';
import type { RoomHost } from './host-types';

const M = t.classroom.mute;
const DONE: Record<MuteSource, string> = { microphone: M.micDone, camera: M.camDone };
const named = (line: string, name: string) => line.replace('{name}', name);

/** The cameras (one per person), not the shared screens. */
const peopleOf = (tiles: readonly RoomTile[]): RoomTile[] => tiles.filter((x) => !x.screen);

/**
 * The participants panel's state (canvas RoomXTeacher): per person mute / camera off / «إخراج»
 * (asked first, the web's wording), «كتم الجميع», and «إنهاء الحلقة للجميع» (asked first). No host
 * (the family) or a role without these powers: the list only. The tiles update by themselves.
 */
export function useHostPanel(host: RoomHost | null, me: JoinRole | null, tiles: RoomTile[]) {
  const [kick, setKick] = useState<RoomTile | null>(null);
  const [ending, setEnding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const people = peopleOf(tiles);
  const acting = host === null ? null : me;
  const quiet = muteAllTargets(acting, people);
  const run = (work: Promise<unknown>, done: string | null) => {
    setBusy(true);
    setNotice(null);
    void work
      .then(() => setNotice(done), (e: unknown) => setNotice(joinError(e)))
      .finally(() => {
        setBusy(false);
        setKick(null);
      });
  };
  return {
    people,
    kick,
    ending,
    busy,
    notice,
    canMute: (p: RoomTile, source: MuteSource) =>
      source === 'microphone' ? mayMuteMic(acting, p) : mayStopCam(acting, p),
    canKick: (p: RoomTile) => mayRemove(acting, p),
    canMuteAll: quiet.length > 0,
    canEnd: mayEndForAll(acting),
    mute: (p: RoomTile, source: MuteSource) =>
      host && run(host.mute({ identity: p.identity, source }), named(DONE[source], p.name)),
    muteAll: () => host && run(host.muteAll(quiet.map((p) => p.identity)), M.allDone),
    askKick: setKick,
    cancelKick: () => setKick(null),
    confirmKick: () =>
      host && kick && run(host.remove(kick.identity), named(t.classroom.kick.done, kick.name)),
    askEnd: () => setEnding(true),
    cancelEnd: () => setEnding(false),
    confirmEnd: () => host && run(host.end(), null),
  };
}
