import { useEffect, useState } from 'react';
import type { MediaDevice } from '#/classroom/room/components/room-types.ts';
import { canProbe, constraintsOf, inputsOf, problemOf, type ProbeState } from './media-probe';

export interface ProbeInput {
  device: MediaDevice;
  /** Off: nothing is asked for and the device's light goes out. */
  enabled: boolean;
  deviceId: string | undefined;
  /** Bumped by «حاول مرة أخرى» to ask again. */
  attempt: number;
}

const OFF: ProbeState = { status: 'off' };
const STARTING: ProbeState = { status: 'starting' };

/** The opened stream with the device list; a failed listing frees the device before failing. */
async function withDevices(device: MediaDevice, stream: MediaStream): Promise<ProbeState> {
  try {
    const devices = inputsOf(device, await navigator.mediaDevices.enumerateDevices());
    const track = stream.getTracks()[0];
    return track ? { status: 'on', track, devices } : { status: 'missing' };
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }
}

async function start(device: MediaDevice, deviceId: string | undefined): Promise<ProbeState> {
  if (!canProbe()) return { status: 'missing' };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraintsOf(device, deviceId));
    return await withDevices(device, stream);
  } catch (error) {
    return { status: problemOf(error) };
  }
}

/**
 * One device of the check, live while it is on: its own getUserMedia stream (stopped when it is
 * switched off, changed or the check closes, so the room can open the device next). The answer
 * is kept with the request it answers, so a stale one never shows.
 */
export function useMediaProbe({ device, enabled, deviceId, attempt }: ProbeInput): ProbeState {
  const key = `${device}|${deviceId ?? ''}|${attempt}`;
  const [answer, setAnswer] = useState<{ key: string; state: ProbeState } | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    let track: MediaStreamTrack | null = null;
    void start(device, deviceId).then((state) => {
      track = state.status === 'on' ? state.track : null;
      if (live) setAnswer({ key, state });
      else track?.stop();
    });
    return () => {
      live = false;
      track?.stop();
    };
  }, [key, device, enabled, deviceId]);
  const current = answer?.key === key ? answer.state : STARTING;
  return enabled ? current : OFF;
}
