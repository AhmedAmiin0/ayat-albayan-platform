import {
  mayEndForAll,
  mayMuteMic,
  mayRemove,
  mayStopCam,
  muteAllTargets,
} from '@ab/client-core';
import type { JoinRole, MuteSource } from '@ab/schedule';
import { useState } from 'react';
import { classroomError } from '../state/room-failure';
import type { RoomTile } from '../model/room-types';
import { t } from '../../lib/i18n/i18n';
import type { RoomHost } from './host-types';

const M = t.classroom.mute;
const DONE: Record<MuteSource, string> = { microphone: M.micDone, camera: M.camDone };
const named = (line: string, name: string) => line.replace('{name}', name);

interface HostPanelInput {
  host: RoomHost | null;
  me: JoinRole | null;
  tiles: readonly RoomTile[];
  /** The room closes for good. */
  onEnded: () => void;
}

/** The cameras (one per person), not the shared screens. */
const peopleOf = (tiles: readonly RoomTile[]): RoomTile[] => tiles.filter((x) => !x.screen);

/** No host (the family) or a role without these powers sees the list only. */
export function useHostPanel({ host, me, tiles, onEnded }: HostPanelInput) {
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
      .then(() => setNotice(done), (e: unknown) => setNotice(classroomError(e)))
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
    confirmEnd: () => host && run(host.end().then(onEnded), null),
  };
}
