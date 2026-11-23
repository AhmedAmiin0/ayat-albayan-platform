// Guard that nothing is left untranslated: finds Arabic text in source code outside comments, i.e.
// in string literals or JSX text. UI copy belongs in ar.json / en.json.

/** Arabic, Arabic Supplement and presentation forms (code points: the source stays ASCII). */
const ARABIC = new RegExp(
  `[${[
    [0x600, 0x6ff],
    [0x750, 0x77f],
    [0xfb50, 0xfdff],
    [0xfe70, 0xfefe],
  ]
    .map(([a = 0, b = 0]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
    .join('')}]`,
);

export interface ArabicHit {
  line: number;
  text: string;
}

type Mode = 'code' | 'line' | 'block' | 'string';

interface ScanState {
  mode: Mode;
  quote: string;
}

/** What one character adds to the output, and how many following characters it consumes. */
type Step = [out: string, skip: number];

/** The two-character openers that start a comment, and the mode each one enters. */
const OPENERS: Partial<Record<string, Mode>> = { '//': 'line', '/*': 'block' };
const QUOTES = new Set(["'", '"', '`']);

const keepNewline = (c: string): string => (c === '\n' ? c : '');
// ' and " never span lines: a stray apostrophe in JSX text cannot hide the rest of the file.
const closesString = (quote: string, c: string): boolean =>
  c === quote || (c === '\n' && quote !== '`');

function inLineComment(s: ScanState, c: string): Step {
  if (c === '\n') s.mode = 'code';
  return [keepNewline(c), 0];
}

function inBlockComment(s: ScanState, c: string, next: string): Step {
  const closes = c === '*' && next === '/';
  if (closes) s.mode = 'code';
  return closes ? ['', 1] : [keepNewline(c), 0];
}

function inString(s: ScanState, c: string, next: string): Step {
  if (c === '\\') return [c + next, 1];
  if (closesString(s.quote, c)) s.mode = 'code';
  return [c, 0];
}

function inCode(s: ScanState, c: string, next: string): Step {
  const opener = OPENERS[c + next];
  if (opener) {
    s.mode = opener;
    return ['', 1];
  }
  if (QUOTES.has(c)) {
    s.mode = 'string';
    s.quote = c;
  }
  return [c, 0];
}

const STEPS: Record<Mode, (s: ScanState, c: string, next: string) => Step> = {
  code: inCode,
  line: inLineComment,
  block: inBlockComment,
  string: inString,
};

/** The source with comments blanked out (strings and newlines kept, so line numbers hold). */
export function stripComments(source: string): string {
  const state: ScanState = { mode: 'code', quote: '' };
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const [text, skip] = STEPS[state.mode](state, source.charAt(i), source.charAt(i + 1));
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
