// Test fakes for the inbound catch-up (not shipped behaviour). No network: Kapso is a vi.fn(); the
// webhook's real InboundService runs over the in-memory fakes (webhook.fakes services()).
import { vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import {
  fakeExternalQueries,
  fakeKapso,
} from '@/modules/messaging/webhook/external/external.fakes';
import type { ExternalQueries } from '@/modules/messaging/webhook/external/external.queries';
import type { KapsoHistory } from '@/modules/messaging/webhook/external/kapso-history';
import { services } from '@/modules/messaging/webhook/webhook.fakes';
import { InboundCatchUpJob } from './inbound-catchup.job';
import type { InboundCatchUpRepo } from './inbound-catchup.repo';
import { InboundCatchUp } from './inbound-catchup.service';
import { InboundGapAlert } from './inbound-gap.alert';
import { InboundListing } from './inbound-listing';

/** 2026-10-30 09:00:00 UTC, inside the incident's gap. */
export const GAP_AT = new Date('2026-10-30T09:00:00Z');
export const GAP_TS = String(GAP_AT.getTime() / 1000);
/** Three hours later: a gap message is late (> LATE_MS) by then. */
export const NOW = new Date('2026-10-30T12:00:00Z');
/** An example family number (Meta's wa_id, digits only). */
export const FAMILY_WA = '966501234567';

/** A family's text as Kapso's inbound history returns it. */
export function kapsoInbound(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'wamid.IN1',
    type: 'text',
    timestamp: GAP_TS,
    from: FAMILY_WA,
    text: { body: 'السلام عليكم، متى الحلقة؟' },
    kapso: { direction: 'inbound', phone_number: `+${FAMILY_WA}` },
    ...over,
  };
}

export const page = (messages: unknown[], after?: string) => ({ messages, after });

/** The catch-up service, its alert and job over the fakes. */
export function catchUpRig() {
  const s = services();
  const ext = fakeExternalQueries(s.queries.stored);
  const kapso = fakeKapso();
  const repo = {
    newestInbound: vi.fn().mockResolvedValue(null as Date | null),
    lastExternalReply: vi.fn().mockResolvedValue(null as Date | null),
  };
  const queries = ext as unknown as ExternalQueries;
  const listing = new InboundListing(queries, kapso as unknown as KapsoHistory);
  const store = repo as unknown as InboundCatchUpRepo;
  const catchUp = new InboundCatchUp(store, listing, queries, s.inbound);
  const alert = new InboundGapAlert(s.push as unknown as PushService);
  const job = new InboundCatchUpJob(catchUp, alert);
  return { ...s, ext, kapso, repo, catchUp, alert, job };
}
