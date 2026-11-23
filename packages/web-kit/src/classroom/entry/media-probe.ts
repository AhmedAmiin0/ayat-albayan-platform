import { z } from 'zod';
import { t } from '#/lib/i18n/index.ts';
import type { MediaDevice } from '#/classroom/room/components/room-types.ts';

/** Why the device check could not start a device: refused by the person/browser, or none there. */
export type ProbeProblem = 'denied' | 'missing';

/** One device in the check: starting, live (with its track), switched off, or a problem. */
export type ProbeState =
  | { status: 'starting' }
  | { status: 'on'; track: MediaStreamTrack; devices: MediaDeviceInfo[] }
  | { status: 'off' }
  | { status: ProbeProblem };

const DENIED: ReadonlySet<string> = new Set([
  'NotAllowedError',
  'SecurityError',
  'PermissionDeniedError',
]);

// A getUserMedia rejection is a DOMException; only its name matters here.
const errorName = z.object({ name: z.string() });

/** NotAllowedError (and kin) is a refusal; anything else means no usable device. */
export function problemOf(error: unknown): ProbeProblem {
  const parsed = errorName.safeParse(error);
  return parsed.success && DENIED.has(parsed.data.name) ? 'denied' : 'missing';
}

const TEXT: Readonly<Record<MediaDevice, Readonly<Record<ProbeProblem, string>>>> = {
  mic: { denied: t.classroom.error.mic_denied, missing: t.classroom.error.device_missing },
  cam: { denied: t.classroom.error.cam_denied, missing: t.classroom.error.device_missing },
};

/** The alert line for a device's problem; null while it is fine. */
export function problemText(device: MediaDevice, state: ProbeState): string | null {
  return state.status === 'denied' || state.status === 'missing' ? TEXT[device][state.status] : null;
}

const KIND: Readonly<Record<MediaDevice, 'audio' | 'video'>> = { mic: 'audio', cam: 'video' };
const INPUT: Readonly<Record<MediaDevice, MediaDeviceKind>> = {
  mic: 'audioinput',
  cam: 'videoinput',
};

/** getUserMedia's constraints for one device, on the picked one when there is a pick. */
export function constraintsOf(
  device: MediaDevice,
  deviceId: string | undefined,
): MediaStreamConstraints {
  return { [KIND[device]]: deviceId ? { deviceId: { exact: deviceId } } : true };
}

/** The devices of that kind (their names show once the person allowed it). */
export const inputsOf = (device: MediaDevice, all: readonly MediaDeviceInfo[]) =>
  all.filter((d) => d.kind === INPUT[device]);

// Only a secure page has navigator.mediaDevices, whatever the DOM types say.
const probeSchema = z.object({
  mediaDevices: z.object({ getUserMedia: z.custom<unknown>((v) => typeof v === 'function') }),
});

/** The browser can ask for a camera or microphone at all. */
export const canProbe = (): boolean => probeSchema.safeParse(navigator).success;
