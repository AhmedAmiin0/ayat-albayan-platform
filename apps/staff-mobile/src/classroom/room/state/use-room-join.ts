import { apiErrorCode } from '@ab/client-core';
import { useState, type ActionDispatch } from 'react';
import { mediaWish } from '@/classroom/room/model/cam-mic';
import { takeHandoff } from '@/classroom/room/model/join-handoff';
import type { PhaseEvent } from '@/classroom/room/model/room-phase';
import type {
  CamMicAnswer,
  MediaWish,
  RoomClient,
  RoomCredentials,
  RoomPlatform,
  RoomTarget,
} from '@/classroom/room/model/room-types';
import { roomFailure } from './room-failure';

export interface JoinInput {
  client: RoomClient;
  platform: RoomPlatform;
  target: RoomTarget;
  dispatch: ActionDispatch<[PhaseEvent]>;
  fetchJoin: (target: RoomTarget) => Promise<RoomCredentials>;
  /** Before connecting: the controls start over (the front camera). */
  onJoining: () => void;
  /** Connected: the controls read the output LiveKit chose. */
  onJoined: () => void;
}

/** One's role and the chat flag of the current join (null before the first one). */
export type JoinedAs = Pick<RoomCredentials, 'role' | 'chat'>;

/** A refusal that means the lesson was ended for everyone (410 lesson_ended): no way back. */
const endedForAll = (e: unknown): boolean => apiErrorCode(e) === 'lesson_ended';

/**
 * Joining and leaving: the handed-over token (else the join endpoint), the audio session, the
 * connect with only what was allowed. Never an output forced: LiveKit keeps a headset.
 */
export function useRoomJoin(input: JoinInput) {
  const { client, platform, target, dispatch, fetchJoin } = input;
  const [joined, setJoined] = useState<JoinedAs | null>(null);
  const join = async (answer: CamMicAnswer, wanted: MediaWish) => {
    dispatch({ type: 'join' });
    input.onJoining();
    try {
      const creds = takeHandoff(target) ?? (await fetchJoin(target));
      setJoined({ role: creds.role, chat: creds.chat });
      await platform.audio.start();
      await client.connect(creds, mediaWish(answer, wanted));
      dispatch({ type: 'joined' });
      input.onJoined();
    } catch (e) {
      client.disconnect();
      void platform.audio.stop();
      dispatch(endedForAll(e) ? { type: 'ended' } : { type: 'failed', message: roomFailure(e) });
    }
  };
  const leave = () => {
    dispatch({ type: 'leave' });
    client.disconnect();
    void platform.audio.stop();
  };
  return { joined, join, leave };
}
