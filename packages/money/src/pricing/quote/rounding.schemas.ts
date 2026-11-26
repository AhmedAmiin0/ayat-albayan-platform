import { z } from 'zod';

/** How a discounted price reaches a whole currency unit; the staff member picks one per quote. */
export const ROUNDING_MODES = ['nearest', 'up', 'down'] as const;
export const roundingSchema = z.enum(ROUNDING_MODES);
export type Rounding = z.infer<typeof roundingSchema>;

/** The calculator's own rule, and what every package price is recorded with. */
export const DEFAULT_ROUNDING: Rounding = 'nearest';
