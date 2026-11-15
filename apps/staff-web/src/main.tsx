import { localeDir } from '@ab/shared';
// Self-hosted fonts (no Google Fonts at runtime): Noto Sans Arabic for all UI text and titles
// (owner, 2026-10-05: an easier font to read; the PDF report keeps its own faces).
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/500.css';
import '@fontsource/noto-sans-arabic/600.css';
import '@fontsource/noto-sans-arabic/700.css';
import './index.css';
import { env } from './lib/http/env';
import { t } from './lib/i18n/i18n';
import { loadOverrides } from './lib/i18n/i18n-overrides';
import { loadLocaleStrings } from './lib/i18n/locale-strings';
import { locale } from './lib/i18n/locale';

// index.html paints Arabic RTL. The chosen language's texts (English is its own chunk) and then
// the admins' translation overrides (≤ 1.5 s, else the bundle) go into `t` FIRST, and an English
// page flips <html>, THEN the app: boot.tsx pulls in the router and every screen, some of which
// copy strings at module load. An English chunk that fails to load leaves the page fully Arabic.
void loadLocaleStrings(t, locale)
  .then((shown) => {
    document.documentElement.lang = shown;
    document.documentElement.dir = localeDir(shown);
    return loadOverrides(t, { apiUrl: env.apiUrl, locale: shown });
  })
  .then(() => import('./boot'));
