import { cloneBundle } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';

/**
 * UI strings (rule 10) in the language chosen at boot (lib/locale); en.json has ar.json's key tree
 * (packages/shared i18n-parity test). Never hard-code text in components.
 * `t` is a copy of the Arabic bundle: main.tsx writes the English texts (lib/i18n/locale-strings,
 * their own chunk) and then the admins' overrides (lib/i18n-overrides) into it before any screen
 * module loads, so even strings copied at module load show the edited text.
 */
export const t: typeof ar = cloneBundle(ar);

/** The bundled texts, never changed: the defaults and offline fallback («الأصل» in the editor). */
export const BUNDLES = { ar } as const;
