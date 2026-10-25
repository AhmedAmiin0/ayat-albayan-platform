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
import { locale } from './lib/i18n/locale';

// index.html paints Arabic RTL; an English choice flips <html> before React renders anything.
document.documentElement.lang = locale;
document.documentElement.dir = localeDir(locale);

// The admins' translation overrides go into `t` first (≤ 1.5 s, else the bundle), THEN the app:
// boot.tsx pulls in the router and every screen, some of which copy strings at module load.
void loadOverrides(t, { apiUrl: env.apiUrl, locale }).then(() => import('./boot'));
