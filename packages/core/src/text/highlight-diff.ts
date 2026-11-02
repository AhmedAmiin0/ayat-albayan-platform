import { normalizeArabic } from './arabic.js';

// Which letters of `text` differ from `other` (duplicate dialog, R-STU-03, docs/07 §14.2).
// Both names are aligned on their normalizeArabic() letters (so tashkeel / tatweel never shift the
// alignment), then every letter of `text` that is unmatched or matched to a different raw letter
// (ة vs ه, أ vs ا) is reported. Ranges index `[...text]` (code points), so the UI slices the raw
// name into ONE inline run and wraps only the differing letter (colour + underline, no box).

export interface DiffRange {
  start: number;
  end: number;
}
export interface DiffSegment {
  text: string;
  diff: boolean;
}

interface Letter {
  index: number;
  raw: string;
  key: string;
}

/** One entry per letter that survives normalisation; tashkeel / tatweel are dropped. */
function letters(s: string): Letter[] {
  return [...s].flatMap((raw, index) => {
    const key = /\s/.test(raw) ? ' ' : normalizeArabic(raw);
    return key ? [{ index, raw, key }] : [];
  });
}

/** LCS lengths: cell(i, j) = LCS of a[i..] and b[j..]. Names are short; O(n·m) is fine. */
function lcsTable(a: string[], b: string[]): (i: number, j: number) => number {
  const w = b.length + 1;
  const dp = new Array<number>((a.length + 1) * w).fill(0);
  const cell = (i: number, j: number) => dp[i * w + j] ?? 0;
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j] ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }
  return cell;
}

/** Pairs each letter of `a` (by its index in the raw text) with its LCS partner in `b`. */
function lcsPairs(a: Letter[], b: Letter[]): Map<number, Letter> {
  const cell = lcsTable(
    a.map((l) => l.key),
    b.map((l) => l.key),
  );
  const pairs = new Map<number, Letter>();
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    const ai = a[i] as Letter;
    const bj = b[j] as Letter;
    if (ai.key === bj.key) {
      pairs.set(ai.index, bj);
      i++;
      j++;
    } else if (cell(i + 1, j) >= cell(i, j + 1)) i++;
    else j++;
  }
  return pairs;
}

/** Tashkeel / tatweel: dropped by normalisation, not whitespace. */
function isMark(c: string | undefined): boolean {
  return c !== undefined && !/\s/.test(c) && normalizeArabic(c) === '';
}

/** Differing letter ranges in `text` (marks after a differing letter ride along with it). */
export function diffRanges(text: string, other: string): DiffRange[] {
  const mine = letters(text);
  const pairs = lcsPairs(mine, letters(other));
  const chars = [...text];
  const ranges: DiffRange[] = [];
  for (const l of mine) {
    if (l.key === ' ' || pairs.get(l.index)?.raw === l.raw) continue;
    let end = l.index + 1;
    while (isMark(chars[end])) end++;
    const last = ranges.at(-1);
    if (last && last.end === l.index) last.end = end;
    else ranges.push({ start: l.index, end });
  }
  return ranges;
}

/** `text` split into plain / differing runs, in order, for rendering. */
export function diffSegments(text: string, other: string): DiffSegment[] {
  const chars = [...text];
  const segments: DiffSegment[] = [];
  let at = 0;
  for (const r of diffRanges(text, other)) {
    if (r.start > at) segments.push({ text: chars.slice(at, r.start).join(''), diff: false });
    segments.push({ text: chars.slice(r.start, r.end).join(''), diff: true });
    at = r.end;
  }
  if (at < chars.length) segments.push({ text: chars.slice(at).join(''), diff: false });
  return segments;
}
