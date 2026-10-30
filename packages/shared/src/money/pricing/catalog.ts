// Package catalog, copied from ayatalbayan.com/calculator (docs/08 §2). Every price the platform
// quotes comes from these numbers. `base` is SAR. Names/taglines live in ar.json `pricing.tiers`.

import { asciiDigits } from '../../core/format/index.js';

/** Lesson durations a price exists for (the site's TA). Weekly is fixed at 90 instead. */
export const PRICING_DURATIONS = [30, 45, 60] as const;
export type PricingDuration = (typeof PRICING_DURATIONS)[number];
export const DEFAULT_DURATION: PricingDuration = 45;

/** Site order (AA): the four tiers, then the two special packages. */
export const PACKAGE_IDS = ['starter', 'standard', 'premium', 'bulk', 'weekly', 'monthly'] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

/** The site's discount pills. Its number field next to them takes any 0–100 (see parseDiscount). */
export const DISCOUNTS = [0, 5, 10, 15] as const;
export const DISCOUNT_MAX = 100;

export interface Tier {
  id: 'starter' | 'standard' | 'premium' | 'bulk';
  lessons: number;
  base: Readonly<Record<PricingDuration, number>>;
  popular?: true;
  featured?: true;
}

/** The site's Vi. starter is the per-lesson reference; bulk (featured) is the 28-lesson rate. */
export const TIERS = [
  { id: 'starter', lessons: 8, base: { 30: 90, 45: 120, 60: 160 } },
  { id: 'standard', popular: true, lessons: 12, base: { 30: 135, 45: 180, 60: 235 } },
  { id: 'premium', lessons: 16, base: { 30: 175, 45: 240, 60: 315 } },
  { id: 'bulk', featured: true, lessons: 28, base: { 30: 275, 45: 385, 60: 495 } },
] as const satisfies readonly Tier[];
export const [STARTER, , , BULK] = TIERS;

/** One 90-minute lesson a week; the price ignores the chosen duration (site EA). */
export const WEEKLY = { id: 'weekly', lessons: 4, duration: 90, base: 145 } as const;
/** Five days a week (site RA). */
export const MONTHLY = {
  id: 'monthly',
  lessons: 20,
  base: { 30: 210, 45: 285, 60: 375 },
} as const;

/** Custom lesson counts the calculator accepts. */
export const CUSTOM_COUNT_MIN = 1;
export const CUSTOM_COUNT_MAX = 60;
/** «عدد مخصوص» opens on 10 lessons, as on the site. */
export const CUSTOM_COUNT_DEFAULT = 10;
/** Students per quote the calculator accepts (the site's stepper stops at 6). */
export const STUDENTS_MIN = 1;
export const STUDENTS_MAX = 6;

export function lessonsOf(id: PackageId): number {
  if (id === 'weekly') return WEEKLY.lessons;
  if (id === 'monthly') return MONTHLY.lessons;
  return tierOf(id).lessons;
}

/** Site xA: the SAR base of a package for a duration. */
export function basePrice(id: PackageId, duration: PricingDuration): number {
  if (id === 'weekly') return WEEKLY.base;
  if (id === 'monthly') return MONTHLY.base[duration];
  return tierOf(id).base[duration];
}

/**
 * The site's discount field: `Number(text) || 0`, clamped to 0–100. Also takes Arabic-Indic and
 * Persian digits and «٫» / «,» as the decimal point (a phone's Arabic keypad).
 */
export function parseDiscount(text: string): number {
  const western = asciiDigits(text.trim()).replace(/[٫,]/g, '.');
  return Math.min(DISCOUNT_MAX, Math.max(0, Number(western) || 0));
}

function tierOf(id: Tier['id']): Tier {
  const tier: Tier | undefined = TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`unknown tier ${id}`);
  return tier;
}
