import { useReducer, useState, useSyncExternalStore } from 'react';
import { nextPhase, type RoomPhase } from '@/classroom/room/model/room-phase';
import type {
  MediaWish,
  RoomCredentials,
  RoomPlatform,
  RoomTarget,
} from '@/classroom/room/model/room-types';
import { useAutoJoin } from './use-auto-join';
import { useRoomControls } from './use-room-controls';
import { useRoomJoin } from './use-room-join';
import { useRoomLifecycle } from './use-room-lifecycle';
import { useRoomPreview } from './use-room-preview';

export interface RoomSessionInput {
  platform: RoomPlatform;
  target: RoomTarget;
  /** The join endpoint (a retry, or no token handed over by the press). */
  fetchJoin: (target: RoomTarget) => Promise<RoomCredentials>;
  /** Opened from the «بدأت الحلقة» push: no preview, the microphone on. */
  direct?: boolean;
}

const START: RoomPhase = { step: 'checking' };

/** The room screen's whole state: its phase, LiveKit's snapshot, the preview and the controls. */
export function useRoomSession({ platform, target, fetchJoin, direct = false }: RoomSessionInput) {
  const [client] = useState(() => platform.createClient());
  const [phase, dispatch] = useReducer(nextPhase, START);
  const snap = useSyncExternalStore(client.subscribe, client.snapshot);
  const preview = useRoomPreview(platform, phase.step === 'preview');
  const controls = useRoomControls(client, platform.audio, snap);
  useRoomLifecycle({ client, platform, dispatch, onChecked: preview.setAnswer });
  const room = useRoomJoin({
    client,
    platform,
    target,
    dispatch,
    fetchJoin,
    onJoining: controls.reset,
    onJoined: () => void controls.syncOutput(),
  });
  const joinWith = (wish: MediaWish) => room.join(preview.answer, wish);
  useAutoJoin({ phase, devices: platform.devices, direct, join: (w) => void joinWith(w) });
  const answer = async (ask: boolean) => {
    const got = ask ? await platform.media.ask() : null;
    if (got) preview.setAnswer(got);
    dispatch({ type: 'answered', answer: got });
  };
  return {
    phase,
    snap,
    preview,
    controls,
    joined: room.joined,
    allow: () => answer(true),
    skip: () => answer(false),
    /** «انضم الآن»: the preview's choice is kept for the next joins. */
    join: async () => {
      void platform.devices.save(preview.wanted);
      await joinWith(preview.wanted);
    },
    leave: room.leave,
    retry: () => dispatch({ type: 'retry' }),
  };
}
