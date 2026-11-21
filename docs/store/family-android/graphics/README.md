# Store graphics

| File | Size | Made from |
|---|---|---|
| `icon-512.png` | 512 × 512 PNG | `apps/family-mobile/assets/icon.png` (the launcher icon: the academy emblem on #064E3B), scaled |
| `feature-graphic-1024x500.png` | 1024 × 500 PNG, no alpha | `source/feature.html`: brand green #064E3B, the emblem `docs/design/brand/logo-mark-transparent.png`, «آيات البيان» and a line in Noto Sans Arabic (the app's font), right to left |

Rendered with headless Chromium (Playwright) at device scale 1. To re-render, copy into one folder:
`source/*.html`, `apps/family-mobile/assets/icon.png` (as `icon.png`),
`docs/design/brand/logo-mark-transparent.png` (as `mark.png`), and from
`@expo-google-fonts/noto-sans-arabic` the files `700Bold/NotoSansArabic_700Bold.ttf` (as `bold.ttf`)
and `500Medium/NotoSansArabic_500Medium.ttf` (as `med.ttf`); then screenshot `icon.html` at 512 × 512
and `feature.html` at 1024 × 500:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await page.goto(`file://${dir}/feature.html`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'feature-graphic-1024x500.png' });
```
