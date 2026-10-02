// A4: one sheet row naming several children («هالة وتالا», «تالا و هاله», «Hala & Tala»).
// Pure. Splits only shapes that are unambiguous enough; every split is flagged for the owner.
import { normalizeArabic } from '@ab/shared';

// First names that start with «و»: «محمد وليد» is a person (name + father), not two children.
const WAW_NAMES = new Set(
  [
    'وليد',
    'وعد',
    'وفاء',
    'وئام',
    'ورد',
    'وردة',
    'وسام',
    'وجدان',
    'وداد',
    'وائل',
    'وحيد',
    'وديع',
    'وسيم',
    'وصال',
    'ولاء',
    'وجد',
    'وهبة',
    'وجيه',
  ].map(normalizeArabic),
);

/** Strips a trailing «(12)» count/age and surrounding noise. */
export function cleanName(raw: string): string {
  return raw
    .replace(/\(\s*\d+\s*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitWaw(part: string): string[] {
  const tokens = part.split(' ');
  const [first, second] = tokens;
  if (tokens.length !== 2 || !first || !second || !second.startsWith('و')) return [part];
  const rest = second.slice(1);
  if (rest.length < 2 || WAW_NAMES.has(normalizeArabic(second))) return [part];
  return [first, rest];
}

/**
 * Names of the children on one row. «أم X وY» is a mother's kunya and stays one name.
 * ponytail: shape heuristic (separators, or exactly two words joined by «و»); three-word names
 * with «و» stay whole and reach the owner through merge review instead.
 */
export function splitSiblings(raw: string): string[] {
  const name = cleanName(raw);
  if (/^(?:ام|أم)\s/.test(name)) return [name];
  const parts = name
    .split(/\s+و\s+|\s*[&+،,]\s*|\s+and\s+/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(splitWaw);
  return parts.length > 0 ? parts : [name];
}
