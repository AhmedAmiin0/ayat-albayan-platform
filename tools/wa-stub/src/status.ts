// The delivery statuses POST /__stub/status forwards, shaped as Meta sends them (docs/12 §5).
import type { Json } from './providers/meta.ts';
import { unixSeconds } from './webhook.ts';

/** POST /__stub/status body: a delivery status for a message the stub accepted. */
export interface StatusSpec {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorCode?: number;
  errorTitle?: string;
  timestamp?: number;
}

const priced = (recipient: string): Json => ({
  conversation: { id: `conv-${recipient}`, origin: { type: 'utility' } },
  pricing: { billable: true, pricing_model: 'PMP', category: 'utility' },
});

/** What Meta adds to each status: pricing on sent and delivered, the error on failed. */
const STATUS_EXTRAS: Record<StatusSpec['status'], (spec: StatusSpec, recipient: string) => Json> = {
  sent: (_spec, recipient) => priced(recipient),
  delivered: (_spec, recipient) => priced(recipient),
  read: () => ({}),
  failed: (spec) => ({
    errors: [{ code: spec.errorCode ?? 131026, title: spec.errorTitle ?? 'Message undeliverable' }],
  }),
};

export function statusValue(spec: StatusSpec, recipient: string): Json {
  const s: Json = {
    id: spec.id,
    status: spec.status,
    timestamp: unixSeconds(spec.timestamp),
    recipient_id: recipient,
    ...STATUS_EXTRAS[spec.status](spec, recipient),
  };
  return { statuses: [s] };
}
