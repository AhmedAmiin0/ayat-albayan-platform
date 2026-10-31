import { cloneBundle } from '@ab/shared';
import arBundle from '@ab/shared/i18n/ar.json';
import enBundle from '@ab/shared/i18n/en.json';

// Texts the server writes (report PDFs, WhatsApp bodies, CSV exports, push notifications, …) come
// from `ar` below: a copy of ar.json that TranslationsService keeps merged with the admins'
// overrides (table translation_overrides), leaf by leaf IN PLACE. A sub-object captured at module
// load (`const { students: S } = ar`) therefore stays current; a single string copied into a
// module-level constant would not, so producers read leaves when they build a text.
// Parent-facing output stays Arabic (owner decision pending on English), hence only `ar` here.

/** The bundled defaults, never mutated: the editor's «الأصل» and the base every refresh starts from. */
export const BUNDLES = { ar: arBundle, en: enBundle } as const;

/** The academy's Arabic copy with overrides applied. Read it; only TranslationsService writes it. */
export const ar: typeof arBundle = cloneBundle(arBundle);
