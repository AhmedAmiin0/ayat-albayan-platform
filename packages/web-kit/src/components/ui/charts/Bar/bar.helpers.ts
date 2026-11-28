/** The filled part of a bar, from 0 to 1; a zero or negative max draws an empty track. */
export function shareOf(value: number, max: number): number {
  const ratio = max > 0 ? value / max : 0;
  return Math.min(1, Math.max(0, ratio));
}
