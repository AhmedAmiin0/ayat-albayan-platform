import type {
  ChannelPickedFile,
  ChannelRecorder,
  ChannelVoicePlayer,
  ChannelVoiceStatus,
} from '@ab/mobile-kit';
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';

// The student chat's voice notes on the staff phone (expo-audio 57): a recorder made on the first
// tap (never at mount: an older APK without the native recorder only gets «false»), and one player
// per note, made on its first tap.

/** AAC in MP4, mono, 48 kbps (~360 KB a minute). Read when recording: never at import. */
const voiceOptions = () => ({
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 48_000,
});

/** The recorded m4a's bytes: fetch on the local file (as a picked PDF is read in the inbox). */
async function voiceFile(uri: string, durationMs: number): Promise<ChannelPickedFile> {
  const bytes = await (await fetch(uri)).arrayBuffer();
  return { mime: 'audio/mp4', name: 'voice.m4a', size: bytes.byteLength, bytes, durationMs };
}

/** Stops and frees a recorder; never throws. */
async function finish(rec: AudioRecorder): Promise<string | null> {
  try {
    if (rec.isRecording) await rec.stop();
    return rec.uri;
  } catch {
    return null;
  } finally {
    rec.release();
  }
}

/** The microphone as the chat's port wants it: start (permission first), stop → the file, drop. */
export function createChannelRecorder(): ChannelRecorder {
  let current: AudioRecorder | null = null;
  const take = () => {
    const rec = current;
    current = null;
    return rec;
  };
  const start = async (): Promise<boolean> => {
    const allowed = await requestRecordingPermissionsAsync();
    if (!allowed.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    const rec = new AudioModule.AudioRecorder(voiceOptions());
    current = rec;
    await rec.prepareToRecordAsync();
    rec.record();
    return true;
  };
  const stop = async (): Promise<ChannelPickedFile | null> => {
    const rec = take();
    if (!rec) return null;
    const ms = rec.getStatus().durationMillis;
    const uri = await finish(rec);
    return uri ? voiceFile(uri, ms) : null;
  };
  const cancel = () => {
    const rec = take();
    if (rec) void finish(rec);
  };
  return { start, stop, cancel };
}

const statusOf = (s: AudioStatus): ChannelVoiceStatus => ({
  playing: s.playing,
  positionMs: s.currentTime * 1000,
  durationMs: s.duration * 1000,
});

/** One voice note's player (heard with the ringer on silent); back to its start once it ends. */
export function playChannelVoice(input: {
  url: string;
  onStatus: (status: ChannelVoiceStatus) => void;
}): ChannelVoicePlayer {
  const mode = { playsInSilentMode: true, allowsRecording: false };
  void setAudioModeAsync(mode).catch(() => undefined);
  const player = createAudioPlayer(input.url);
  const sub = player.addListener('playbackStatusUpdate', (s) => {
    input.onStatus(statusOf(s));
    if (s.didJustFinish) void player.seekTo(0);
  });
  return {
    toggle: () => (player.playing ? player.pause() : player.play()),
    seek: (fraction) => void player.seekTo(fraction * player.duration),
    release: () => {
      sub.remove();
      player.remove();
    },
  };
}
