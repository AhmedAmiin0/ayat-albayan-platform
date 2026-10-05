// Guard for «nothing untranslated» (owner, 2026-10-05): finds Arabic text in source code outside
// comments, i.e. in string literals or JSX text. UI copy belongs in ar.json / en.json.

/** Arabic, Arabic Supplement and the presentation forms (code points, so the source stays ASCII). */
const ARABIC = new RegExp(`[${[[0x600, 0x6ff], [0x750, 0x77f], [0xfb50, 0xfdff], [0xfe70, 0xfefe]]
  .map(([a = 0, b = 0]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
  .join('')}]`);

export interface ArabicHit {
  line: number;
  text: string;
}

interface ScanState {
  mode: 'code' | 'line' | 'block';
  quote: string | null;
}

/** What one character adds to the output, and how many following characters it consumes. */
type Step = [out: string, skip: number];

function inComment(s: ScanState, c: string, next: string): Step {
  if (s.mode === 'line') {
    if (c === '\n') s.mode = 'code';
    return [c === '\n' ? c : '', 0];
  }
  if (c === '*' && next === '/') {
    s.mode = 'code';
    return ['', 1];
  }
  return [c === '\n' ? c : '', 0];
}

function inString(s: ScanState, c: string, next: string): Step {
  if (c === '\\') return [c + next, 1];
  // ' and " never span lines: a stray apostrophe in JSX text cannot hide the rest of the file.
  if (c === s.quote || (c === '\n' && s.quote !== '`')) s.quote = null;
  return [c, 0];
}

function step(s: ScanState, c: string, next: string): Step {
  if (s.mode !== 'code') return inComment(s, c, next);
  if (s.quote !== null) return inString(s, c, next);
  if (c === '/' && (next === '/' || next === '*')) {
    s.mode = next === '/' ? 'line' : 'block';
    return ['', 1];
  }
  if (c === "'" || c === '"' || c === '`') s.quote = c;
  return [c, 0];
}

/** The source with comments blanked out (strings and newlines kept, so line numbers hold). */
export function stripComments(source: string): string {
  const state: ScanState = { mode: 'code', quote: null };
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const [text, skip] = step(state, source.charAt(i), source.charAt(i + 1));
    out += text;
    i += skip;
  }
  return out;
}

/** Each line with Arabic outside comments (1-based line numbers, trimmed text). */
export function arabicLiterals(source: string): ArabicHit[] {
  return stripComments(source)
    .split('\n')
    .flatMap((text, i) => (ARABIC.test(text) ? [{ line: i + 1, text: text.trim() }] : []));
}
