import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

/** Evolution's failure for the admin, in words: the key refused, or Evolution unreachable (502). */
export function evolutionFailure(e: unknown): unknown {
  if (!(e instanceof WaError)) return e;
  return waHttpError(e.info.credential === 'evolution' ? 'evolution_auth' : 'evolution_unreachable', 502);
}
