import { describe, expect, it } from 'vitest';
import { HttpWhatsappClient } from './whatsapp.client';
import { KAPSO_ENV, kapsoFetch } from './drivers/kapso/kapso.fakes';
import { scriptedFetch, STUB_ENV, templateRow } from './whatsapp.fakes';

// «تعديل» on Meta (owner 2026-11-14): POST /{template id} with the components only (the name and
// the category never change); Kapso through ?hsm_id=. Fakes, no network.

const BASE = 'http://127.0.0.1:4010/kapso/v24.0';
const display = { header: null, buttons: [{ type: 'quick_reply', text: 'نعم' }] };
const row = templateRow({
  key: 'summer_offer', meta_name: 'summer_offer', meta_id: '1234567890', status: 'approved',
  body_ar: 'أهلًا {{1}}، لدينا عرض', params: ['var_1'], samples: ['أحمد'], buttons: [], display,
});

describe('editTemplate', () => {
  it('meta: POST /{id} with the components, never a name or a category', async () => {
    const f = scriptedFetch({ status: 200, body: { success: true } });
    const client = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch, timeoutMs: 1_000 });
    await expect(client.editTemplate(row)).resolves.toEqual({ status: 'PENDING' });
    expect(f.requests[0]?.url).toMatch(/\/1234567890$/);
    expect(f.requests[0]?.init.method).toBe('POST');
    expect(f.requests[0]?.body).toEqual({
      components: [
        { type: 'BODY', text: 'أهلًا {{1}}، لدينا عرض', example: { body_text: [['أحمد']] } },
        { type: 'FOOTER', text: 'أكاديمية آيات البيان' },
        // A plain quick reply lives in display only: the edit keeps it.
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'نعم' }] },
      ],
    });
  });

  it('kapso: /{waba}/message_templates?hsm_id=<id>', async () => {
    const f = kapsoFetch({ status: 200, body: { success: true } });
    const client = new HttpWhatsappClient(KAPSO_ENV, { fetch: f.fetch, timeoutMs: 1_000 });
    await client.editTemplate(row);
    expect(f.requests[0]?.url).toBe(`${BASE}/stub-waba/message_templates?hsm_id=1234567890`);
  });

  it('a registry URL button keeps its sample suffix', async () => {
    const f = scriptedFetch({ status: 200, body: { success: true } });
    const client = new HttpWhatsappClient(STUB_ENV, { fetch: f.fetch, timeoutMs: 1_000 });
    await client.editTemplate(templateRow({ meta_id: '42', body_ar: 'حلقة {{1}} — {{2}} اليوم' }));
    const body = f.requests[0]?.body as { components: { type: string; buttons?: unknown }[] };
    expect(body.components.find((c) => c.type === 'BUTTONS')).toEqual({
      type: 'BUTTONS',
      buttons: [{ type: 'URL', text: '', url: 'https://meet.jit.si/{{1}}', example: ['https://meet.jit.si/sample'] }],
    });
  });
});
