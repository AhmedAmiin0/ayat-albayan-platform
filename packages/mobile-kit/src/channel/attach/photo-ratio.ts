/** The thumb's width to height, kept between a tall 3:4 and a wide 2:1 (ChatX boards). */
const TALLEST = 0.75;
const WIDEST = 2;

/** A loaded photo's aspect ratio for its 240pt thumb; square when its size is not known. */
export function photoRatio(size: { width: number; height: number } | undefined): number {
  const raw = size && size.height > 0 ? size.width / size.height : 1;
  return Math.min(WIDEST, Math.max(TALLEST, raw || 1));
}
