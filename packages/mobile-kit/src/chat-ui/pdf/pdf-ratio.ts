/** An A4 page's height over its width: the page's box until its image says its own. */
export const A4 = 1.414;

/** A loaded image's height over its width (its onLoad source); A4 when it reports no size. */
export const imageRatio = ({ width, height }: { width: number; height: number }): number =>
  width > 0 && height > 0 ? height / width : A4;
