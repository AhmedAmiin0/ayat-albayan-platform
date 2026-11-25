import { useState } from 'react';
import type { MediaChoice, MediaDevice } from '@ab/web-kit/classroom/room/components/room-types';
import { problemText, type ProbeState } from './media-probe';
import type { JoinPick } from './saved-choice';
import { useMediaProbe } from './use-media-probe';

interface Pick {
  on: boolean;
  id: string | undefined;
  /** Every change asks again (a fresh request never shows a stale answer). */
  attempt: number;
}

export interface DeviceControl {
  device: MediaDevice;
  on: boolean;
  id: string | undefined;
  state: ProbeState;
  /** The alert line while it is refused or missing. */
  problem: string | null;
  toggle: () => void;
  choose: (id: string) => void;
}

const bump = (p: Pick, patch: Partial<Pick>): Pick => ({ ...p, ...patch, attempt: p.attempt + 1 });

function useDevice(device: MediaDevice, initial: { on: boolean; id: string | undefined }) {
  const [pick, setPick] = useState<Pick>({ ...initial, attempt: 0 });
  const { on: enabled, id: deviceId, attempt } = pick;
  const state = useMediaProbe({ device, enabled, deviceId, attempt });
  const control: DeviceControl = {
    device,
    on: pick.on,
    id: pick.id,
    state,
    problem: problemText(device, state),
    toggle: () => setPick((p) => bump(p, { on: !p.on })),
    choose: (id) => setPick((p) => bump(p, { id })),
  };
  return { control, retry: () => setPick((p) => bump(p, { on: true })) };
}

/** Joins with it only if it is on and not refused or missing. */
const usable = (c: DeviceControl): boolean => c.on && c.problem === null;

/** Refused or missing right now (never remembered: the check shows again next time). */
const troubled = (c: DeviceControl): boolean => c.problem !== null;

export interface DeviceCheckController {
  mic: DeviceControl;
  cam: DeviceControl;
  /** Ask for both again after allowing them in the browser. */
  retry: () => void;
  /** Remembered only when no device had a problem. */
  choice: () => JoinPick;
}

/** Microphone and camera, each on or off and on which device. */
export function useDeviceCheck(initial: MediaChoice): DeviceCheckController {
  const mic = useDevice('mic', { on: initial.mic, id: initial.micId });
  const cam = useDevice('cam', { on: initial.cam, id: initial.camId });
  return {
    mic: mic.control,
    cam: cam.control,
    retry: () => {
      mic.retry();
      cam.retry();
    },
    choice: () => ({
      media: {
        mic: usable(mic.control),
        cam: usable(cam.control),
        micId: mic.control.id,
        camId: cam.control.id,
      },
      remember: !troubled(mic.control) && !troubled(cam.control),
    }),
  };
}
