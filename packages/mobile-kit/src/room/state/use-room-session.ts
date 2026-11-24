import { useReducer, useState, useSyncExternalStore } from 'react';
import { nextPhase, type RoomPhase } from '../model/room-phase';
import type {
  MediaWish,
  RoomCredentials,
  RoomPlatform,
  RoomTarget,
} from '../model/room-types';
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
  /** Opened from the lesson-started push: no preview, microphone on. */
  direct?: boolean;
  /** Keep the device choice and skip the preview next time (the family's room only). */
  rememberChoice?: boolean;
}

const START: RoomPhase = { step: 'checking' };

/** The room screen's whole state: its phase, LiveKit's snapshot, the preview and the controls. */
export function useRoomSession(input: RoomSessionInput) {
  const { platform, target, fetchJoin, direct = false, rememberChoice = false } = input;
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
  useAutoJoin({
    phase,
    devices: platform.devices,
    direct,
    remember: rememberChoice,
    join: (w) => void joinWith(w),
  });
  const answer = async (ask: boolean) => {
    const got = ask ? await platform.media.ask() : null;
    if (got) preview.setAnswer(got);
    dispatch({ type: 'answered', answer: got });
  };
  return {
    target,
    phase,
    snap,
    preview,
    controls,
    joined: room.joined,
    /** When this join went live (epoch ms): the recording pill's timer. */
    joinedAt: room.joinedAt,
    allow: () => answer(true),
    skip: () => answer(false),
    /** The preview's choice is kept for later joins, and the push reads it too. */
    join: async () => {
      void platform.devices.save(preview.wanted);
      await joinWith(preview.wanted);
    },
    leave: room.leave,
    /** Final, no rejoin. */
    endedForAll: () => dispatch({ type: 'ended' }),
    retry: () => dispatch({ type: 'retry' }),
  };
}
