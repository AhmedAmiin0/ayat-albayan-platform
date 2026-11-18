import { encode } from 'uqr';

// «رمز QR» of a short link (boards LinkXWebDetail, LinkXStaffDetail): the module matrix from uqr
// (MIT, no dependencies, pure TS) and one SVG path of the dark modules, so the web (<svg>) and
// mobile (react-native-svg) draw the same code with a single <path>.

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

/** The dark runs of one row: start column and length. */
function darkRuns(row: readonly boolean[]): Run[] {
  const runs: Run[] = [];
  row.forEach((dark, x) => {
    const last = runs.at(-1);
    const grows = dark && last !== undefined && last.x + last.length === x;
    if (grows) last.length += 1;
    else if (dark) runs.push({ x, length: 1 });
  });
  return runs;
}

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
