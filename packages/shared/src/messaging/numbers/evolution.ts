import { z } from 'zod';
import { EVOLUTION_MODES } from '@ab/catalog';

// An Evolution number (docs/19 «Evolution driver»): its instance name is the row's
// phone_number_id, its token the number secret `evolution_token`; these are the rest.

/** The engine and the Baileys safety switch, on a number whose provider is evolution. */
export const evolutionFieldsSchema = z.object({
  evolution_mode: z.enum(EVOLUTION_MODES).nullable(),
  /** Baileys only: automatic notifications and templates may go out (default off: staff chat). */
  evolution_auto_sends: z.boolean(),
});

/** Evolution's connection states (CONNECTION_UPDATE / connectionState); anything else = unknown. */
export const EVOLUTION_STATES = ['open', 'connecting', 'close', 'refused'] as const;
export const evolutionStateSchema = z.enum(EVOLUTION_STATES);
export type EvolutionState = z.infer<typeof evolutionStateSchema>;
export const evolutionStateOf = (raw: unknown): EvolutionState | null =>
  EVOLUTION_STATES.find((s) => s === raw) ?? null;

/** Only a PNG data URL is ever shown as the QR image (never a link to another host). */
export const QR_DATA_URL_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
