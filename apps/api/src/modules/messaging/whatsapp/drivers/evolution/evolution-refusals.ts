import { WA_ERROR } from '@ab/shared';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The Evolution driver's refusals made before any call (docs/19 «Evolution driver»).

/** What Evolution cannot do from here: the template list, submit, samples (and cloud media). */
export const evolutionUnsupported = (what: string): WaError =>
  new WaError(`${what} is not supported by the Evolution driver`, {
    code: null, status: 0, unsupported: 'evolution',
  });

/** A Baileys number with automatic sends off refuses a job's row (docs/19): fails, never sent. */
export const evolutionAutoOff = (): WaError =>
  new WaError('automatic sends are off on this Baileys number', {
    code: WA_ERROR.invalidParameter, status: 0, unsupported: 'evolution', blocked: 'evolution_auto_off',
  });

export const notAllowed = (): WaError =>
  new WaError('recipient not allowed', { code: WA_ERROR.recipientNotAllowed, status: 0 });
