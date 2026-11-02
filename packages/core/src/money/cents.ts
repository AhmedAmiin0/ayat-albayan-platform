// Money in piasters (integers): numeric(12,2) comes back as a JS number and 0.1 + 0.2 must not
// break a balance, a total or a comparison. One copy for the api, web and mobile (docs/32 k2).

/** 12.34 → 1234. */
export const toCents = (v: number): number => Math.round(v * 100);

/** 1234 → 12.34. */
export const fromCents = (c: number): number => c / 100;

/** Money is shown and summed to 2 decimals: 0.1 + 0.2 → 0.3. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** At most 2 decimals (numeric(12,2)): the refine of every typed amount. */
export const hasTwoDecimals = (v: number): boolean =>
  Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
