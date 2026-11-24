import { encode } from 'uqr';

// One SVG path of the dark modules so web and mobile draw the same code.

export type QrEcc = 'L' | 'M' | 'Q' | 'H';

/** The quiet zone the QR standard asks for, in modules. */
export const QR_QUIET_ZONE = 4;

/** The code's modules, row by row (true = dark), without a quiet zone. */
export function qrMatrix(text: string, ecc: QrEcc = 'M'): boolean[][] {
  return encode(text, { ecc, border: 0 }).data;
}

/** The side of the drawing in modules: the matrix and a quiet zone on each side (the viewBox). */
export const qrSide = (matrix: readonly (readonly boolean[])[], quiet = QR_QUIET_ZONE): number =>
  matrix.length + 2 * quiet;

interface Run {
  x: number;
  length: number;
}

/** Does a dark run start at column x (dark, after a light module or the edge)? */
const startsRun = (row: readonly boolean[], x: number): boolean =>
  row[x] === true && row[x - 1] !== true;

/** How many dark modules run from column x to the next light one (or the edge). */
function runLength(row: readonly boolean[], x: number): number {
  const end = row.indexOf(false, x);
  return (end === -1 ? row.length : end) - x;
}

/** The dark runs of one row: start column and length. */
const darkRuns = (row: readonly boolean[]): Run[] =>
  row.flatMap((_, x) => (startsRun(row, x) ? [{ x, length: runLength(row, x) }] : []));

/**
 * The `d` of one path covering every dark module, one rectangle per horizontal run, shifted by
 * the quiet zone: draw it in a `0 0 side side` viewBox (qrSide) with a light background.
 */
export function qrPath(matrix: readonly (readonly boolean[])[], quiet = QR_QUIET_ZONE): string {
  return matrix
    .flatMap((row, y) =>
      darkRuns(row).map((r) => `M${r.x + quiet} ${y + quiet}h${r.length}v1h-${r.length}z`),
    )
    .join('');
}
