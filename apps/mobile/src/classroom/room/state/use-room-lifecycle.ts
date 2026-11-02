import { useEffect, type ActionDispatch } from 'react';
import { closedBy, type PhaseEvent } from '@/classroom/room/model/room-phase';
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
  useEffect(() => {
    let was = client.snapshot().status;
    return client.subscribe(() => {
      const status = client.snapshot().status;
      // Closed under us («إنهاء», the max-duration job's DeleteRoom, a removal): the call audio
      // ends with the room. Only on the change, so a rejoin's events (still «ended») keep it.
      if (status !== was && closedBy(status)) void platform.audio.stop();
      was = status;
      dispatch({ type: 'status', status });
    });
  }, [client, platform, dispatch]);
  useEffect(
    () => () => {
      client.close();
      void platform.audio.stop();
    },
    [client, platform],
  );
}
