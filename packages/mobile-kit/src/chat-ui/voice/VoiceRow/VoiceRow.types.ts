import type { WaveSeek } from '../Waveform';
import type { Rate } from '../voice-math';

export interface VoiceRowProps {
  /** Seeds the drawn waveform: the same note looks the same on every render. */
  id: string;
  kind: string;
  playing: boolean;
  busy: boolean;
  progress: number;
  /** The length, or the position while it plays; '' until known. */
  clock: string;
  onToggle: () => void;
  /** The bubble's menu (reply, forward), as a long press on the button. */
  onLongPress?: () => void;
  onSeek: (fraction: number) => void;
  seek?: WaveSeek;
  /** Once playback has started: the speed chip. */
  speed?: { rate: Rate; onPress: () => void };
}
