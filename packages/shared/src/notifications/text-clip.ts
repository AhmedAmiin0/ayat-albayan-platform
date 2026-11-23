// A push or bell row quotes the start of a message. JS strings are UTF-16, so `slice` can cut an
// emoji (two code units) in half and leave a lone surrogate («�» on the lock screen). These cut by
// code points (Array.from) instead.

/** The first `max` code points of `text`. */
export const sliceCodePoints = (text: string, max: number): string =>
  Array.from(text).slice(0, max).join('');

/** `text` when it has at most `max` code points, else its first `max - 1` and «…». */
export function clipText(text: string, max: number): string {
  const points = Array.from(text);
  return points.length > max ? `${points.slice(0, max - 1).join('')}…` : text;
}
