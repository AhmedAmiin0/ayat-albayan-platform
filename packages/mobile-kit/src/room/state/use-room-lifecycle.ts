import { useEffect, type ActionDispatch } from 'react';
import { AppState } from 'react-native';
import { closedBy, type PhaseEvent } from '../model/room-phase';
import type { CamMicAnswer, RoomClient, RoomPlatform } from '../model/room-types';

interface LifecycleInput {
  client: RoomClient;
  platform: RoomPlatform;
  dispatch: ActionDispatch<[PhaseEvent]>;
  /** The permissions read (on open, and again back from the settings): the preview's camera. */
  onChecked: (answer: CamMicAnswer) => void;
}

/** The permission check on open, and again when the app comes back (from the device settings). */
function usePermissionCheck({ platform, dispatch, onChecked }: Omit<LifecycleInput, 'client'>) {
  useEffect(() => {
    let live = true;
    void platform.media.check().then((answer) => {
      if (!live) return;
      onChecked(answer);
      dispatch({ type: 'checked', answer });
    });
    // Returning from settings with permission granted clears the blocked notice (preview only).
    const back = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void platform.media.check().then((answer) => {
        if (!live) return;
        onChecked(answer);
        dispatch({ type: 'rechecked', answer });
      });
    });
    return () => {
      live = false;
      back.remove();
    };
  }, [platform, dispatch, onChecked]);
}

/**
 * The room screen's effects: the permission checks, LiveKit's status into the phase, and on
 * leaving the screen (back, sign-out) the room left and the audio session stopped.
 */
export function useRoomLifecycle({ client, platform, dispatch, onChecked }: LifecycleInput) {
  usePermissionCheck({ platform, dispatch, onChecked });
  useEffect(() => {
    let was = client.snapshot().status;
    return client.subscribe(() => {
      const status = client.snapshot().status;
      // Audio stops only on the change to closed, so a rejoin's still-ended events keep it.
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
