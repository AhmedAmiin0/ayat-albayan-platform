import { useEffect, type ActionDispatch } from 'react';
import type { PhaseEvent } from '@/classroom/room/model/room-phase';
import type { CamMicAnswer, RoomClient, RoomPlatform } from '@/classroom/room/model/room-types';

interface LifecycleInput {
  client: RoomClient;
  platform: RoomPlatform;
  dispatch: ActionDispatch<[PhaseEvent]>;
  /** The permissions already granted (Android), so the preview can open the camera at once. */
  onChecked: (answer: CamMicAnswer) => void;
}

/**
 * The room screen's effects: the permission check on open, LiveKit's status into the phase, and on
 * leaving the screen (back, sign-out) the room left and the audio session stopped.
 */
export function useRoomLifecycle({ client, platform, dispatch, onChecked }: LifecycleInput) {
  useEffect(() => {
    let live = true;
    void platform.media.check().then((answer) => {
      if (!live) return;
      onChecked(answer);
      dispatch({ type: 'checked', answer });
    });
    return () => {
      live = false;
    };
  }, [platform, dispatch, onChecked]);
  useEffect(
    () => client.subscribe(() => dispatch({ type: 'status', status: client.snapshot().status })),
    [client, dispatch],
  );
  useEffect(
    () => () => {
      client.close();
      void platform.audio.stop();
    },
    [client, platform],
  );
}
