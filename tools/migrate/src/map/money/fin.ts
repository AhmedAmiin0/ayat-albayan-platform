// FIN income statement «Revenue / Desc» (columns E/F, EGP): one row per paying student per month.
// A row naming several people («A + B», «A & B») is a shared payment and never priced alone. Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { num, text } from '../../sources/sheets/cells.ts';
import type { SourceRow } from '../../types.ts';

/** Statement tab per month (`general` is August). */
const FIN_MONTHS: Record<string, string> = { '2026-08': 'fin_aug', '2026-09': 'fin_sept' };

const tokens = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

export function finPrice(
  bundle: SourceBundle,
  q: { name: string; month: string },
): { amount: number; fin: SourceRow['ref'] } | null {
  const id = FIN_MONTHS[q.month];
  const [first] = tokens(q.name);
  if (!id || !first) return null;
  const hits = (bundle.sheets[id] ?? []).filter((r) => {
    const desc = text(r.fields['revenue_desc']);
    return desc !== null && tokens(desc).includes(first);
  });
  const [hit] = hits;
  if (hits.length !== 1 || !hit) return null;
  const desc = text(hit.fields['revenue_desc']) ?? '';
  const amount = num(hit.fields['revenue_amount']);
  if (/[+&,]|\band\b/i.test(desc) || amount === null || amount <= 0) return null;
  return { amount, fin: hit.ref };
}
