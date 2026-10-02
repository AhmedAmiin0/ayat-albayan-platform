import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontCss, LOGO_PATH, logoDataUri, pdfAssets } from './pdf-assets';

describe('PDF assets — self-hosted fonts and the real emblem (docs/07 §13)', () => {
  const css = fontCss();
  const faces = css.split('@font-face').slice(1);

  it('embeds Amiri 700 and Plex 400/600/700, arabic + latin subsets, as woff2 data', () => {
    expect(faces).toHaveLength(8);
    expect(faces.filter((f) => f.includes("font-family:'Amiri'"))).toHaveLength(2);
    for (const w of [400, 600, 700]) {
      expect(faces.filter((f) => f.includes("'IBM Plex Sans Arabic'") && f.includes(`font-weight:${w};`))).toHaveLength(2);
    }
    expect(faces.every((f) => f.includes("src:url(data:font/woff2;base64,"))).toBe(true);
  });

  it('never prints with a fallback: font-display block, no remote URL', () => {
    expect(faces.every((f) => f.includes('font-display:block;'))).toBe(true);
    expect(css).not.toMatch(/https?:/);
  });

  it("keeps fontsource's unicode ranges, so Arabic and Western digits each find their file", () => {
    expect(faces.every((f) => f.includes('unicode-range:U+'))).toBe(true);
    expect(css).toContain('unicode-range:U+0600-06FF');
    expect(css).toContain('unicode-range:U+0000-00FF');
  });

  it('the emblem is the derived brand mark, a PNG', () => {
    expect(existsSync(LOGO_PATH)).toBe(true);
    expect(readFileSync(LOGO_PATH).subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(logoDataUri()).toMatch(/^data:image\/png;base64,iVBOR/);
  });

  it('reads the files once per process', () => {
    expect(pdfAssets()).toBe(pdfAssets());
  });
});
