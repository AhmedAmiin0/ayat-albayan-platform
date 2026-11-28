/**
 * The page hands the decoded RGBA bytes back as one base64 string: a JSON array of numbers for a
 * full-page screenshot is tens of millions of entries and stalled the compare step for hours.
 */
export function pixelsFromBase64(data: string): Uint8ClampedArray {
  return new Uint8ClampedArray(Buffer.from(data, 'base64'));
}
