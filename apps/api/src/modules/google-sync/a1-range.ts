// A1 ranges as the sync writes them ('A2:M', 'D5:F5', 'G5', 'Sheet1!A1'): shared by the fake
// client and the writers. Columns are 0-based, rows 1-based; an open end means "to the last row".

export interface A1 {
  col: number;
  row: number | null;
  endCol: number;
  endRow: number | null;
}

const colIndex = (letters: string): number => [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
export const colLetter = (index: number): string => {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export function parseA1(range: string): A1 {
  const ref = range.includes('!') ? range.slice(range.indexOf('!') + 1) : range;
  const [a = '', b] = ref.split(':');
  const start = /^([A-Z]+)(\d+)?$/.exec(a);
  if (!start?.[1]) throw new Error(`bad range ${range}`);
  const end = b ? /^([A-Z]+)(\d+)?$/.exec(b) : start;
  if (!end?.[1]) throw new Error(`bad range ${range}`);
  return { col: colIndex(start[1]), row: start[2] ? Number(start[2]) : null, endCol: colIndex(end[1]), endRow: end[2] ? Number(end[2]) : null };
}

/** The first row number of an append's updatedRange ('Sheet1!A7:M7' → 7). */
export const rowOf = (range: string): number | null => parseA1(range).row;
