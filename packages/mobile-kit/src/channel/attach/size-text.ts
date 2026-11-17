import { t } from '../../lib/i18n/i18n';

const KB = 1024;
const MB = KB * KB;

/** «240 كيلوبايت» under 1 MB (at least 1), else «1.2 ميغابايت»; Western digits. */
export function sizeText(bytes: number): string {
  const words = t.inbox.pdf;
  if (bytes >= MB) return words.mb.replace('{n}', (bytes / MB).toFixed(1));
  return words.kb.replace('{n}', String(Math.max(1, Math.round(bytes / KB))));
}
