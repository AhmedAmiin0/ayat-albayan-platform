/** «1:05» for 65 s: a voice note's length or position, as WhatsApp shows it (Western digits). */
export function mediaTime(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

/** How far along, 0–1; 0 until the duration is known. */
export function mediaProgress(current: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(current)) return 0;
  return Math.min(1, Math.max(0, current / duration));
}
