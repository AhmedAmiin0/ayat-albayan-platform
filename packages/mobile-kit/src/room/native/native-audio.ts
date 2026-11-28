import { Platform } from 'react-native';
import { autoOutput, knownOutputs, nextOutput, type AudioOutput } from '../model/audio-output';
import type { RoomAudio } from '../model/room-types';
import type { LiveKitNative } from './livekit-native';

const quiet = (p: Promise<unknown>): Promise<void> =>
  p.then(
    () => undefined,
    () => undefined,
  );

type Session = LiveKitNative['sdk']['AudioSession'];

const outputsOf = async (session: Session): Promise<AudioOutput[]> =>
  knownOutputs(await session.getAudioOutputs().catch(() => [] as string[]));

/** Android: LiveKit's outputs; the button selects the next one the phone has. */
function androidRoutes(session: Session): Pick<RoomAudio, 'current' | 'next'> {
  return {
    current: async () => autoOutput(await outputsOf(session)),
    async next(current) {
      const next = nextOutput(current, await outputsOf(session));
      if (next) await quiet(session.selectAudioOutput(next));
      return next ?? current;
    },
  };
}

/** iOS routes by itself (a headset, AirPods): the button opens the system's route picker. */
function iosRoutes(session: Session): Pick<RoomAudio, 'current' | 'next'> {
  return {
    current: () => Promise.resolve(null),
    next: () => quiet(session.showAudioRoutePicker()).then(() => null),
  };
}

const ROUTES: Partial<Record<typeof Platform.OS, typeof iosRoutes>> = { ios: iosRoutes };

/**
 * LiveKit's audio session (docs/35): started for the room and stopped after it. Joining never
 * picks an output: LiveKit prefers bluetooth, then a wired headset, then the loudspeaker. Best
 * effort: an output the device lacks keeps the current one.
 */
export function nativeAudio({ sdk }: LiveKitNative): RoomAudio {
  const session = sdk.AudioSession;
  const routes = (ROUTES[Platform.OS] ?? androidRoutes)(session);
  return {
    start: () => quiet(session.startAudioSession()),
    stop: () => quiet(session.stopAudioSession()),
    current: () => routes.current(),
    next: (current) => routes.next(current),
  };
}
