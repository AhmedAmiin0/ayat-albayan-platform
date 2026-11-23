// A4: one row naming several children; splits only unambiguous shapes, each flagged; pure.
import { normalizeArabic } from '@ab/core';

// First names starting with the "and" letter: name + father is one person, not two children.
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

/** A mother's kunya stays one name; three-word names stay whole for merge review. */
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
