import { engineTimeZone } from '@ab/time';

/** The phone's own zone as the engine reports it, UTC when it reports none (the device's clock). */
export const phoneTz = (): string => engineTimeZone() || 'UTC';
