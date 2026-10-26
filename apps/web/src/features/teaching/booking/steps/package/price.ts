import {
  DEFAULT_DURATION,
  normalizePhone,
  PRICING_DURATIONS,
  siteCountry,
  STUDENTS_MAX,
  type Duration,
  type PackageId,
  type PackageSize,
} from '@ab/shared';
import { OTHER, type Selection } from '@/features/finance/pricing/api';

// Wizard package → pricing catalog (docs/08). The client never prices: this only picks which
// GET /pricing/quote to ask for. Lesson counts match the site's packages one to one.

const TIER_BY_SIZE: Partial<Record<PackageSize, PackageId>> = {
  '8': 'starter',
  '12': 'standard',
  '16': 'premium',
  '20': 'monthly',
  '28': 'bulk',
};

export interface PriceInput {
  pkg: PackageSize;
  durationMin: Duration;
  /** Guardian country (ISO-2); anything outside the site's five → USD. */
  country: string | null;
  students: number;
}

/**
 * The quote for a package, or null when the catalog has no price for it: the free trial, a
 * group above the calculator's 6, or 90 minutes outside «باقة الحلقة الأسبوعية» (4 × 90 min).
 */
export function quoteSelection(p: PriceInput): Selection | null {
  if (p.pkg === 'trial' || p.students < 1 || p.students > STUDENTS_MAX) return null;
  const base = { country: siteCountry(p.country) ?? OTHER, count: Number(p.pkg), students: p.students, discount: 0 };
  // Weekly ignores the duration; the quote route still wants one of 30/45/60.
  if (p.durationMin === 90) return p.pkg === '4' ? { ...base, pkg: 'weekly', duration: DEFAULT_DURATION } : null;
  const duration = PRICING_DURATIONS.find((d) => d === p.durationMin);
  if (!duration) return null;
  return { ...base, pkg: TIER_BY_SIZE[p.pkg] ?? 'custom', duration };
}

/** The guardian's country: the stored one, else inferred from the phone's calling code. */
export function guardianCountry(g: { country?: string | null; phone_e164: string }): string | null {
  if (g.country) return g.country;
  const r = normalizePhone(g.phone_e164);
  return r.ok ? r.country : null;
}
