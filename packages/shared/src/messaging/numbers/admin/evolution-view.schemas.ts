import { z } from 'zod';
import { evolutionStateSchema } from '../evolution';

/** Evolution's current connectionState; a word it adds later reads as null on the server. */
export const evolutionStateViewSchema = z.object({
  state: evolutionStateSchema.nullable(),
  checked_at: z.string(),
});
export type EvolutionStateView = z.infer<typeof evolutionStateViewSchema>;

/**
 * Evolution's /instance/connect: a QR (data URL of a PNG) while the instance waits for a scan,
 * null once connected (state open).
 */
export const evolutionQrViewSchema = z.object({
  state: evolutionStateSchema.nullable(),
  qr: z.string().nullable(),
  pairing_code: z.string().nullable(),
});
export type EvolutionQrView = z.infer<typeof evolutionQrViewSchema>;
