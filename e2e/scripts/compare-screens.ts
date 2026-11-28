// pnpm --filter e2e compare-screens --base <dir> --head <dir>
// Prints the base/head screenshot report (support/screens/compare.ts) as Markdown; always exits 0.
import { chromium, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { changedRatio, compareReport } from '../support/screens/compare';
import { pixelsFromBase64 } from '../support/screens/pixels';

const args = z.object({ base: z.string().min(1), head: z.string().min(1) });
const { values } = parseArgs({ options: { base: { type: 'string' }, head: { type: 'string' } } });
const { base, head } = args.parse(values);

const pngsIn = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.png'))
    .toSorted();

// A string, not a function: e2e compiles without the DOM lib, and the page decodes the PNG.
const DECODE = `(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d');
  ctx.drawImage(img, 0, 0);
  const bytes = ctx.getImageData(0, 0, img.width, img.height).data;
  const parts = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
  }
  return btoa(parts.join(''));
})`;

async function pixelsOf(page: Page, file: string): Promise<Uint8ClampedArray> {
  const url = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  const raw = await page.evaluate<unknown>(`${DECODE}(${JSON.stringify(url)})`);
  return pixelsFromBase64(z.string().parse(raw));
}

async function main(): Promise<void> {
  const [before, after] = [pngsIn(base), pngsIn(head)];
  const shared = after.filter((f) => before.includes(f));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const ratios: Record<string, number> = {};
  for (const file of shared) {
    // Sequential on purpose: one page decodes one pair at a time to bound memory on the runner.
    ratios[file] = changedRatio(
      await pixelsOf(page, join(base, file)),
      await pixelsOf(page, join(head, file)),
    );
  }
  await browser.close();
  const added = after.filter((f) => !before.includes(f));
  const missing = before.filter((f) => !after.includes(f));
  console.log(compareReport({ ratios, added, missing }));
}

await main();
