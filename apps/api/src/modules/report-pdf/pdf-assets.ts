import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Fonts and logo embedded in the report HTML as data URIs, so Chromium never fetches anything and
// the PDF carries its own fonts (docs/07 §13: self-hosted, never Google Fonts at render time).

export interface PdfAssets {
  /** @font-face rules for Amiri 700 and IBM Plex Sans Arabic 400/600/700. */
  fontCss: string;
  /** The academy emblem (PNG data URI). */
  logo: string;
}

/** Arabic for the words, latin for Western digits, codes and the site name. */
const SUBSETS = ['arabic', 'latin'] as const;

const FACES = [
  { pkg: '@fontsource/amiri', slug: 'amiri', family: 'Amiri', weight: 700 },
  { pkg: '@fontsource/ibm-plex-sans-arabic', slug: 'ibm-plex-sans-arabic', family: 'IBM Plex Sans Arabic', weight: 400 },
  { pkg: '@fontsource/ibm-plex-sans-arabic', slug: 'ibm-plex-sans-arabic', family: 'IBM Plex Sans Arabic', weight: 600 },
  { pkg: '@fontsource/ibm-plex-sans-arabic', slug: 'ibm-plex-sans-arabic', family: 'IBM Plex Sans Arabic', weight: 700 },
] as const;

type Face = (typeof FACES)[number];

/** The unicode-range fontsource gives a subset, read from its own CSS so the ranges stay exact. */
function unicodeRange(face: Face, subset: string): string | null {
  const css = readFileSync(require.resolve(`${face.pkg}/${face.weight}.css`), 'utf8');
  const block = css.split('@font-face').find((b) => b.includes(`-${subset}-${face.weight}-normal.woff2`));
  return /unicode-range:\s*([^;]+);/.exec(block ?? '')?.[1] ?? null;
}

function fontFace(face: Face, subset: string): string {
  const file = require.resolve(`${face.pkg}/files/${face.slug}-${subset}-${face.weight}-normal.woff2`);
  const data = readFileSync(file).toString('base64');
  const range = unicodeRange(face, subset);
  return [
    '@font-face{',
    `font-family:'${face.family}';font-style:normal;font-weight:${face.weight};`,
    // block, not swap: never print with a fallback font (the renderer also awaits fonts.ready).
    'font-display:block;',
    `src:url(data:font/woff2;base64,${data}) format('woff2');`,
    range ? `unicode-range:${range};` : '',
    '}',
  ].join('');
}

export function fontCss(): string {
  return FACES.flatMap((face) => SUBSETS.map((s) => fontFace(face, s))).join('\n');
}

/**
 * The emblem on transparency, 192px tall: docs/design/brand/tools/build.mjs derives it from the
 * academy's logo for the web <Mark>. Same depth from src/ and dist/, so one relative path works.
 */
export const LOGO_PATH = join(resolve(__dirname, '../../../../..'), 'apps/web/public/brand/mark.png');

export function logoDataUri(): string {
  return `data:image/png;base64,${readFileSync(LOGO_PATH).toString('base64')}`;
}

let cached: PdfAssets | undefined;

/** Read once per process (about 0.4 MB of base64), on the first render. */
export function pdfAssets(): PdfAssets {
  cached ??= { fontCss: fontCss(), logo: logoDataUri() };
  return cached;
}
