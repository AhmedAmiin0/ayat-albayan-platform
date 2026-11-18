import type { Locale } from '@ab/shared';

// The English copy (en.json, ≈ 265 KB) is NOT in the main bundle: Arabic is the default, so the
// English texts are their own chunk, fetched only when the chosen language is English
// (docs/27 Wave E, e-lazy-1). main.tsx writes them into `t` before boot.tsx loads any screen,
// so a string copied at module load is already English.

/** The English bundle, as its own chunk. */
type LoadBundle = () => Promise<object>;

const importEnglish: LoadBundle = async () => (await import('@ab/shared/i18n/en.json')).default;

const childOf = (node: object, key: string): unknown => (Object.hasOwn(node, key) ? Reflect.get(node, key) : undefined);

/**
 * Writes `source`'s string leaves over `target`'s IN PLACE (walking the trees, so a key that holds
 * a dot — 'permissions.items' has 'leads.read' — is written like any other); how many it wrote.
 */
function writeTree(target: object, source: object): number {
  let written = 0;
  for (const [key, value] of Object.entries(source)) {
    const current = childOf(target, key);
    if (typeof value === 'string') {
      if (typeof current !== 'string' || value === '') continue;
      Reflect.set(target, key, value);
      written += 1;
      continue;
    }
    if (value === null || typeof value !== 'object') continue;
    if (current === null || typeof current !== 'object') continue;
    written += writeTree(current, value);
  }
  return written;
}

/**
 * Writes the chosen language's texts into `target` (lib/i18n `t`) IN PLACE and returns the language
 * now shown. Arabic is bundled, so it loads nothing. A failed chunk leaves the Arabic texts, which
 * are always complete, and returns 'ar' so the page direction and the overrides follow them too.
 */
export async function loadLocaleStrings(target: object, locale: Locale, load: LoadBundle = importEnglish): Promise<Locale> {
  if (locale !== 'en') return locale;
  try {
    writeTree(target, await load());
    return 'en';
  } catch {
    return 'ar';
  }
}
