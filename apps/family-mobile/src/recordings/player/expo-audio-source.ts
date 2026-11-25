import type { AudioSourceEvents, CreateAudioSource } from '@ab/mobile-kit';
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';

// The family player's media: the kit's <AudioPlayer> drives this AudioSource,
// expo-audio plays the signed link (range reads, no download) and reports through its status.

/** What this player has already told the kit; the saved stop is reached before any time is. */
interface Seen {
  loaded: boolean;
  atStart: boolean;
  failed: boolean;
}

interface Ctx {
  player: AudioPlayer;
  startAt: number;
  events: AudioSourceEvents;
  seen: Seen;
}

interface Step {
  when: (status: AudioStatus, seen: Seen) => boolean;
  run: (status: AudioStatus, ctx: Ctx) => void;
}

const fail = (ctx: Ctx): void => {
  ctx.seen.failed = true;
  ctx.events.onFailed();
};

/** Loaded: jump to the saved stop, then the length; the clock waits for the jump. */
const load = (status: AudioStatus, ctx: Ctx): void => {
  ctx.seen.loaded = true;
  ctx.player
    .seekTo(ctx.startAt)
    .then(() => {
      ctx.seen.atStart = true;
    })
    .catch(() => fail(ctx));
  ctx.events.onLoaded(status.duration);
};

const failedNow = (s: AudioStatus, seen: Seen): boolean => s.error !== null && !seen.failed;
const loadedNow = (s: AudioStatus, seen: Seen): boolean => s.isLoaded && !seen.loaded;
const ticking = (s: AudioStatus, seen: Seen): boolean => s.isLoaded && seen.atStart;

/** Each status update, in order: a failure, the first load, the clock, the end. */
const STEPS: readonly Step[] = [
  { when: failedNow, run: (_s, ctx) => fail(ctx) },
  { when: loadedNow, run: load },
  { when: ticking, run: (s, ctx) => ctx.events.onTime(s.currentTime) },
  { when: (s) => s.didJustFinish, run: (_s, ctx) => ctx.events.onEnded() },
];

/** The expo-audio adapter behind the kit's AudioSource; `release` frees the native player. */
export const createAudioSource: CreateAudioSource = ({ url, startAt, events }) => {
  const player = createAudioPlayer(url);
  const seen = { loaded: false, atStart: false, failed: false };
  const ctx: Ctx = { player, startAt, events, seen };
  const subscription = player.addListener('playbackStatusUpdate', (status) => {
    STEPS.filter((step) => step.when(status, ctx.seen)).forEach((step) => step.run(status, ctx));
  });
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (seconds) => {
      player.seekTo(seconds).catch(() => fail(ctx));
    },
    setRate: (rate) => player.setPlaybackRate(rate),
    release: () => {
      subscription.remove();
      player.remove();
    },
  };
};
