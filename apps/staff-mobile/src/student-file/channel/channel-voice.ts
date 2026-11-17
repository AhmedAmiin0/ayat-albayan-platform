import type {
  ChannelPickedFile,
  ChannelRecorder,
  ChannelVoicePlayer,
  ChannelVoiceStatus,
} from '@ab/mobile-kit';
import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';
import { claimPlayback, releasePlayback, voiceOptions } from '@/core/lib/audio';

// The student chat's voice notes on the staff phone (expo-audio 57): the inbox's recording preset
// (AAC in MP4, mono, 48 kbps), a recorder made on the first tap (never at mount: an older APK
// without the native recorder only gets «false»), and one player per note, made on its first tap.
// As in the inbox, one sound at a time (claimPlayback): a note that starts pauses the other.

const RECORDER = 'channel-recorder';

/** The recorded m4a's bytes: fetch on the local file (as a picked PDF is read in the inbox). */
async function voiceFile(uri: string, durationMs: number): Promise<ChannelPickedFile> {
  const bytes = await (await fetch(uri)).arrayBuffer();
  return { mime: 'audio/mp4', name: 'voice.m4a', size: bytes.byteLength, bytes, durationMs };
}

/** Stops and frees a recorder; never throws. */
async function finish(rec: AudioRecorder): Promise<string | null> {
  releasePlayback(RECORDER);
  try {
    if (rec.isRecording) await rec.stop();
    return rec.uri;
  } catch {
    return null;
  } finally {
    rec.release();
  }
}

/** Mic access, the audio mode, then a prepared recorder that records; throws on any failure. */
async function record(): Promise<AudioRecorder> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const rec = new AudioModule.AudioRecorder(voiceOptions());
  try {
    await rec.prepareToRecordAsync();
    rec.record();
    return rec;
  } catch (e) {
    rec.release();
    throw e;
  }
}

/**
 * The microphone as the chat's port wants it: start (permission first; false when it may not or
 * cannot record, the recorder freed), stop → the file, drop; its clock for the bar.
 */
export function createChannelRecorder(): ChannelRecorder {
  let current: AudioRecorder | null = null;
  const take = () => {
    const rec = current;
    current = null;
    return rec;
  };
  const cancel = () => {
    const rec = take();
    if (rec) void finish(rec);
  };
  const start = async (): Promise<boolean> => {
    try {
      const allowed = await requestRecordingPermissionsAsync();
      if (!allowed.granted) return false;
      current = await record();
      claimPlayback(RECORDER, cancel);
      return true;
    } catch {
      return false;
    }
  };
  const stop = async (): Promise<ChannelPickedFile | null> => {
    const rec = take();
    if (!rec) return null;
    const ms = rec.getStatus().durationMillis;
    const uri = await finish(rec);
    return uri ? voiceFile(uri, ms) : null;
  };
  const elapsedMs = () => current?.getStatus().durationMillis ?? 0;
  return { start, stop, cancel, elapsedMs };
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
  const id = `channel-voice:${input.url}`;
  const sub = player.addListener('playbackStatusUpdate', (s) => {
    input.onStatus(statusOf(s));
    if (s.didJustFinish) void player.seekTo(0);
  });
  const play = () => {
    claimPlayback(id, () => player.pause());
    player.play();
  };
  return {
    toggle: () => (player.playing ? player.pause() : play()),
    seek: (fraction) => void player.seekTo(fraction * player.duration),
    release: () => {
      releasePlayback(id);
      sub.remove();
      player.remove();
    },
  };
}
