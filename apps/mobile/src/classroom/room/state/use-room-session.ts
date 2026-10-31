import { useReducer, useState, useSyncExternalStore } from 'react';
import { mediaWish } from '@/classroom/room/model/cam-mic';
import { takeHandoff } from '@/classroom/room/model/join-handoff';
import { nextPhase, type RoomPhase } from '@/classroom/room/model/room-phase';
import type { RoomCredentials, RoomPlatform, RoomTarget } from '@/classroom/room/model/room-types';
import { roomFailure } from './room-failure';
import { useRoomControls } from './use-room-controls';
import { useRoomLifecycle } from './use-room-lifecycle';
import { useRoomPreview } from './use-room-preview';

interface RoomSessionInput {
  platform: RoomPlatform;
  target: RoomTarget;
  /** The join endpoint (a retry, or no token handed over by the press). */
  fetchJoin: (target: RoomTarget) => Promise<RoomCredentials>;
}

const START: RoomPhase = { step: 'checking' };

/** The room screen's whole state: its phase, LiveKit's snapshot, the preview and the controls. */
export function useRoomSession({ platform, target, fetchJoin }: RoomSessionInput) {
  const [client] = useState(() => platform.createClient());
  const [phase, dispatch] = useReducer(nextPhase, START);
  const snap = useSyncExternalStore(client.subscribe, client.snapshot);
  const preview = useRoomPreview(platform, phase.step === 'preview');
  const controls = useRoomControls(client, platform.audio, snap);
  useRoomLifecycle({ client, platform, dispatch, onChecked: preview.setAnswer });
  const answer = async (ask: boolean) => {
    const got = ask ? await platform.media.ask() : null;
    if (got) preview.setAnswer(got);
    dispatch({ type: 'answered', answer: got });
  };
  const join = async () => {
    dispatch({ type: 'join' });
    try {
      const creds = takeHandoff(target) ?? (await fetchJoin(target));
      await platform.audio.start();
      await client.connect(creds, mediaWish(preview.answer, preview.wanted));
      await platform.audio.route(controls.speaker);
      dispatch({ type: 'joined' });
    } catch (e) {
      client.disconnect();
      void platform.audio.stop();
      dispatch({ type: 'failed', message: roomFailure(e) });
    }
  };
  const leave = () => {
    dispatch({ type: 'leave' });
    client.disconnect();
    void platform.audio.stop();
  };
  return {
    phase,
    snap,
    preview,
    controls,
    allow: () => answer(true),
    skip: () => answer(false),
    join,
    leave,
    retry: () => dispatch({ type: 'retry' }),
  };
}
