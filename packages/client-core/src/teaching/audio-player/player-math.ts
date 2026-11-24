// The in-app audio player's pure rules (owner 2026-11-17: «play/pause, ±10 s, speed, resume»),
// shared by the web <audio> player and the mobile player behind its AudioSource adapter.

export const SKIP_SECONDS = 10;

export const PLAYER_SPEEDS = [1, 1.5, 2] as const;
export type PlayerSpeed = (typeof PLAYER_SPEEDS)[number];

/** «1.5×» (the digits stay Latin, as the boards show them). */
export const speedLabel = (speed: number): string => `${String(speed)}×`;

const finite = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/** A position kept inside [0, duration]; an unknown duration (0) only floors at 0. */
export function clampPosition(position: number, duration: number): number {
  const end = finite(duration);
  const at = finite(position);
  return end > 0 ? Math.min(at, end) : at;
}

/** ±10 s from `position`, never before the start or past the end. */
export function skipBy(input: { position: number; duration: number; delta: number }): number {
  return clampPosition(input.position + input.delta, input.duration);
}

const two = (n: number): string => String(n).padStart(2, '0');

/** «12:40», «1:05:09»; a bad value reads «0:00». */
export function formatClock(seconds: number): string {
  const whole = Math.floor(finite(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h > 0 ? `${String(h)}:${two(m)}:${two(s)}` : `${String(m)}:${two(s)}`;
}

/** 0..1 of the way through; 0 while the length is unknown. */
export function progressOf(position: number, duration: number): number {
  const end = finite(duration);
  return end > 0 ? clampPosition(position, end) / end : 0;
}
