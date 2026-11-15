// Renders the family app's icon options (docs/design/family-app/icon-options/*.svg) to PNG, once,
// in a cloud session (never in CI, never in the app): the preview sheets for the owner and option
// A's Expo set in apps/family-mobile/assets. Uses the Chromium + Playwright the cloud image ships, so no
// new dependency:  node docs/design/family-app/render.mjs [option-file.svg]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const OPTIONS = join(here, 'icon-options');
const ASSETS = join(here, '../../../apps/family-mobile/assets');
const WIRED = process.argv[2] ?? 'option-a-book-crescent.svg';
/** The glyph's square on the splash (centre 512, 514): the native splash and the in-app mark. */
const GLYPH_BOX = '252 254 520 520';
const { chromium } = createRequire(import.meta.url)('playwright');

const noBg = (svg) => svg.replace(/<rect id="bg"[^>]*\/>/, '');
const mono = (svg) =>
  noBg(svg).replace('</svg>', '<style>#glyph *{fill:#fff;stroke:#fff}</style></svg>');
const solid = (svg) => svg.replace(/<g id="glyph"[\s\S]*<\/g>\s*<\/svg>/, '</svg>');
/** The full-bleed icon (iOS, legacy Android): no adaptive mask crops it, so the glyph is larger. */
const fullBleed = (svg) => svg.replace(/scale\(([\d.]+)\)/, (_, k) => `scale(${(k * 1.4).toFixed(3)})`);
const cropped = (svg) => noBg(svg).replace('viewBox="0 0 1024 1024"', `viewBox="${GLYPH_BOX}"`);

async function shot(page, { html, size, file }) {
  await page.setViewportSize({ width: size[0], height: size[1] });
  await page.setContent(`<style>*{margin:0}svg{display:block}</style>${html}`);
  writeFileSync(file, await page.screenshot({ omitBackground: true }));
}

const svgAt = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
/** What a launcher shows of an adaptive icon: the middle 72 of its 108 dp. */
const launcher = (svg) => svg.replace('viewBox="0 0 1024 1024"', 'viewBox="171 171 682 682"');

/** The owner's preview: the icon, a launcher row at 48 dp (name under it), light and dark. */
function sheet(svg) {
  const tile = (px) => `<div style="width:${px}px;height:${px}px;border-radius:${px * 0.23}px;
    overflow:hidden">${svgAt(launcher(svg), px)}</div>`;
  const cell = `<div style="width:76px;text-align:center;font:12px Roboto,Arial">
    <div style="display:flex;justify-content:center">${tile(48)}</div>
    <div style="margin-top:6px;white-space:nowrap;overflow:hidden">Ayat Al-Bayan</div></div>`;
  const row = (bg, ink) => `<div style="display:flex;gap:24px;padding:24px;background:${bg};
    color:${ink};border-radius:24px">${cell}${cell}</div>`;
  return `<div style="display:flex;gap:40px;padding:40px;align-items:center;background:#f3f7f5;
    width:1000px;height:400px;box-sizing:border-box">${tile(320)}<div style="display:grid;gap:24px">
    ${row('#dfe7e3', '#17201c')}${row('#1a211e', '#e9efec')}</div>
    <div style="width:160px;height:320px;border-radius:24px;background:#064e3b;display:flex;
    align-items:center;justify-content:center">${svgAt(cropped(svg), 80)}</div></div>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const name of readdirSync(OPTIONS).filter((f) => f.endsWith('.svg'))) {
  const svg = readFileSync(join(OPTIONS, name), 'utf8');
  const file = join(OPTIONS, name.replace('.svg', '.png'));
  await shot(page, { html: sheet(svg), size: [1000, 400], file });
}
const svg = readFileSync(join(OPTIONS, WIRED), 'utf8');
const set = {
  'icon.png': fullBleed(svg),
  'android-icon-foreground.png': noBg(svg),
  'android-icon-background.png': solid(svg),
  'android-icon-monochrome.png': mono(svg),
  'splash-icon.png': cropped(svg),
};
for (const [file, art] of Object.entries(set)) {
  await shot(page, { html: svgAt(art, 1024), size: [1024, 1024], file: join(ASSETS, file) });
}
await browser.close();
