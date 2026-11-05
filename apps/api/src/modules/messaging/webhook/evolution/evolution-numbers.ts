import { isWaLine } from '@ab/shared';
import { overlayNumbers, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { Receiving } from '@/modules/messaging/webhook/lines/webhook.lines';

/** The Evolution number an instance name belongs to (module mode only); null = unknown: 404. */
export interface EvolutionNumber {
  id: string;
  token: string | undefined;
  where: Receiving;
}

const isEvolution = (n: OverlayNumber, instance: string): boolean =>
  n.phone_number_id === instance && n.evolutionToken !== undefined && isWaLine(n.purpose);

/** Read per call: an admin's change in «الأرقام» applies to the next delivery. */
export function evolutionNumber(instance: string): EvolutionNumber | null {
  const n = overlayNumbers()?.find((x) => isEvolution(x, instance));
  if (!n) return null;
  const where: Receiving = { line: n.purpose, numberId: n.id, phoneNumberId: instance };
  return { id: n.id, token: n.evolutionToken, where };
}
