// The report-only base/head screenshot compare (docs/63 §5 «Web bundles, visual no-change»): it
// lists, never fails. Server «now» and demo data move pixels between runs, so it is no proof.

export const MAX_DIFF_RATIO = 0.002;
const CHANNEL_TOLERANCE = 16;

const channelMoved = (a: Uint8ClampedArray, b: Uint8ClampedArray, i: number): boolean =>
  Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > CHANNEL_TOLERANCE;

const pixelMoved = (a: Uint8ClampedArray, b: Uint8ClampedArray, at: number): boolean =>
  [0, 1, 2, 3].some((c) => channelMoved(a, b, at + c));

/** Share of pixels that differ; two RGBA buffers of different sizes differ everywhere. */
export function changedRatio(base: Uint8ClampedArray, head: Uint8ClampedArray): number {
  if (base.length !== head.length) return 1;
  const pixels = base.length / 4;
  const moved = Array.from({ length: pixels }, (_, p) => pixelMoved(base, head, p * 4));
  return moved.filter(Boolean).length / Math.max(pixels, 1);
}

interface Compared {
  ratios: Record<string, number>;
  added: string[];
  missing: string[];
}

const listLine = (title: string, files: string[]): string[] =>
  files.length === 0 ? [] : [`${title}: ${files.join(', ')}`];

/** Markdown for $GITHUB_STEP_SUMMARY: pages above MAX_DIFF_RATIO, then new and missing ones. */
export function compareReport({ ratios, added, missing }: Compared): string {
  const over = Object.entries(ratios)
    .filter(([, ratio]) => ratio > MAX_DIFF_RATIO)
    .toSorted(([, a], [, b]) => b - a);
  const rows = over.map(([file, ratio]) => `| ${file} | ${(ratio * 100).toFixed(3)} % |`);
  const table =
    rows.length === 0
      ? ['No page moved past the limit.']
      : ['| Page | Changed |', '|---|---|', ...rows];
  return [
    '## Screens: base vs head (report only)',
    ...table,
    ...listLine('New pages', added),
    ...listLine('Missing pages', missing),
  ].join('\n');
}
