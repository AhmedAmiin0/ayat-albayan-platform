import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

/** A rejection's WaError info; anything else is rethrown so the test fails on it. */
export function waInfo(e: unknown): WaError['info'] {
  if (e instanceof WaError) return e.info;
  throw e;
}
