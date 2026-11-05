import { z } from 'zod';
import { EVOLUTION_MODES, type EvolutionMode } from '@ab/catalog';

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
export type EvolutionState = (typeof EVOLUTION_STATES)[number];
export const evolutionStateOf = (raw: unknown): EvolutionState | null =>
  EVOLUTION_STATES.find((s) => s === raw) ?? null;

/** NumberView.evolution: null on any other provider. */
export interface NumberEvolutionView {
  mode: EvolutionMode;
  auto_sends: boolean;
  /** Last state Evolution reported by webhook, and when (null = never). */
  state: EvolutionState | null;
  state_at: string | null;
}

/** GET /admin/numbers/:id/evolution/state («افحص الاتصال»): Evolution's connectionState now. */
export interface EvolutionStateView {
  state: EvolutionState | null;
  checked_at: string;
}

/**
 * GET /admin/numbers/:id/evolution/qr: Evolution's /instance/connect. A QR (data URL of a PNG)
 * while the instance waits for a scan; null once connected (state open).
 */
export interface EvolutionQrView {
  state: EvolutionState | null;
  qr: string | null;
  pairing_code: string | null;
}

/** Only a PNG data URL is ever shown as the QR image (never a link to another host). */
export const QR_DATA_URL_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
