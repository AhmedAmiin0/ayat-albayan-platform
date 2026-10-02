// Test fixtures (not shipped behaviour): Meta webhook bodies shaped exactly like
// tools/wa-stub/src/webhook.ts inboundValue / statusValue, so unit tests and e2e agree.

export const PHONE_NUMBER_ID = 'stub-phone-number-id';
export const TS = 1_791_032_400; // 2026-10-03T13:00:00Z
export const TS_DATE = new Date(TS * 1000);

export function envelope(value: object, phoneNumberId = PHONE_NUMBER_ID): object {
  const metadata = { display_phone_number: '15550001111', phone_number_id: phoneNumberId };
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'stub-waba', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata, ...value } }] }],
  };
}

export interface InboundOpts {
  from?: string;
  id?: string;
  name?: string;
  context?: string;
}

/** value.contacts + value.messages for one message; `part` = { type, [type]: … }. */
export function inboundValue(part: object, o: InboundOpts = {}): object {
  const from = o.from ?? '966501234567';
  const message = {
    from,
    id: o.id ?? 'wamid.IN1',
    timestamp: String(TS),
    ...(o.context ? { context: { from: '15550001111', id: o.context } } : {}),
    ...part,
  };
  return { contacts: [{ wa_id: from, profile: { name: o.name ?? 'أم سهيلة' } }], messages: [message] };
}

export const textPart = (body: string) => ({ type: 'text', text: { body } });
export const buttonPart = (text: string, payload: string) => ({ type: 'button', button: { text, payload } });
export const interactivePart = (id: string, title: string) => ({
  type: 'interactive',
  interactive: { type: 'button_reply', button_reply: { id, title } },
});
export const mediaPart = (kind: string, extra: object = {}) => ({
  type: kind,
  [kind]: { id: 'media-1', mime_type: 'image/jpeg', sha256: 'stub', ...extra },
});

export interface StatusOpts {
  id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorCode?: number;
}

export function statusValue(o: StatusOpts): object {
  const s: Record<string, unknown> = { id: o.id ?? 'wamid.OUT1', status: o.status, timestamp: String(TS), recipient_id: '966501234567' };
  if (o.status === 'sent' || o.status === 'delivered') {
    s['conversation'] = { id: 'conv-966501234567', origin: { type: 'utility' } };
    s['pricing'] = { billable: true, pricing_model: 'PMP', category: 'utility' };
  }
  if (o.status === 'failed') s['errors'] = [{ code: o.errorCode ?? 131026, title: 'Message undeliverable' }];
  return { statuses: [s] };
}
