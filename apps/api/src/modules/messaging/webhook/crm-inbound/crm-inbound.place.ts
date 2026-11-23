import {
  overlayNumbers,
  type OverlayNumber,
} from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv, type Env } from '@/config/env/env';
import { crmPlaces } from '@/modules/messaging/webhook/crm-confirm';
import { crmFetch } from '@/modules/messaging/whatsapp';
import type { InboundPlace } from './crm-inbound.event';
import type { CrmInboundSource } from './crm-inbound.service';

// Where a CRM message.received lands (docs/19 «crm driver»): the notifications line, stamped as the
// webhook stamps any line (docs/12 §13.2: only while the chat line is configured); module mode: the
// crm notifications number (its default first), as crmPlaces knows the crm numbers.

const crmNotifications = (n: OverlayNumber): boolean =>
  n.purpose === 'notifications' && n.env?.provider === 'crm';

/** The receiving line and, in module mode, the crm notifications number (null = none). */
export function inboundPlace(env: Env, numbers: readonly OverlayNumber[] | null): InboundPlace {
  if (numbers === null) return { line: lineEnvs(env).chat ? 'notifications' : null, numberId: null };
  const crm = numbers.filter(crmNotifications);
  const pick = crm.find((n) => n.is_default) ?? crm[0];
  return { line: 'notifications', numberId: pick?.id ?? null };
}

/** The live source: loadEnv() and the numbers overlay per call, crmFetch (H-1). */
export const liveCrmInboundSource = (): CrmInboundSource => ({
  env: () => crmPlaces(loadEnv(), overlayNumbers()).env,
  place: () => inboundPlace(loadEnv(), overlayNumbers()),
  fetch: crmFetch,
});
