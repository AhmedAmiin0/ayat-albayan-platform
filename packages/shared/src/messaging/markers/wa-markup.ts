/** How one run of a WhatsApp message is drawn: *bold*, _italic_, ~strike~, ```mono```. */
export interface WaStyle {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  mono: boolean;
}

/** One styled run of text; the markers themselves are gone. */
export interface WaSpan extends WaStyle {
  text: string;
}

type Mark = keyof WaStyle;

const PLAIN: WaStyle = { bold: false, italic: false, strike: false, mono: false };

/** One marker pair: non-space content on one line, the markers touching it. */
const pair = (name: Mark, c: string): string => `${c}(?<${name}>\\S(?:[^\\n]*?\\S)?)${c}`;

/**
 * WhatsApp's rule: a marker opens after a non-letter (a space, the line start, punctuation) and
 * closes before one, so `snake_case_name` and `2*3*4` stay as typed. Mono may span lines and holds
 * no other markup.
 */
const PATTERN = new RegExp(
  '(?<![\\p{L}\\p{N}])(?:```(?<mono>[^]+?)```|' +
    `${pair('bold', '\\*')}|${pair('italic', '_')}|${pair('strike', '~')})(?![\\p{L}\\p{N}])`,
  'gu',
);

/** The groups in the order the pattern tries them. */
const MARKS: readonly Mark[] = ['mono', 'bold', 'italic', 'strike'];

const hit = (groups: Partial<Record<string, string>>): [Mark, string] | undefined =>
  MARKS.map((m): [Mark, string | undefined] => [m, groups[m]]).find(
    (e): e is [Mark, string] => e[1] !== undefined,
  );

/** A match's runs: mono is literal; any other mark parses its inside again (nesting). */
function inner(groups: Partial<Record<string, string>>, style: WaStyle): WaSpan[] {
  const found = hit(groups);
  if (!found) return [];
  const [mark, text] = found;
  const next = { ...style, [mark]: true };
  return mark === 'mono' ? [{ ...next, text }] : parseWaMarkup(text, next);
}

/**
 * Splits a WhatsApp text into styled runs (`*bold*`, `_italic_`, `~strike~`, ```` ```mono``` ````),
 * nested marks combined (`*_x_*` is bold italic). An unclosed marker stays as typed.
 */
export function parseWaMarkup(text: string, style: WaStyle = PLAIN): WaSpan[] {
  const spans: WaSpan[] = [];
  let at = 0;
  for (const m of text.matchAll(PATTERN)) {
    spans.push({ ...style, text: text.slice(at, m.index) }, ...inner(m.groups ?? {}, style));
    at = m.index + m[0].length;
  }
  spans.push({ ...style, text: text.slice(at) });
  return spans.filter((s) => s.text !== '');
}

/** The text as the reader sees it, the markers dropped (a one-line preview, a plain label). */
export function stripWaMarkup(text: string): string {
  return parseWaMarkup(text)
    .map((s) => s.text)
    .join('');
}
