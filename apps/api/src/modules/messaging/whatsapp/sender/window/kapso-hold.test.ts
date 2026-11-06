import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  setNumbersOverlay,
  type OverlayNumber,
} from '@/common/configuration/integrations/numbers-overlay';
import type { FetchLike } from '@/common/infra/http/failure';
import type { WhatsappEnv } from '@/config/env/env';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { KapsoHold } from './kapso-hold';

// Owner 2026-11-06: the Kapso conversation PATCH runs only for a number on the kapso driver,
// never on Meta or CRM. A scripted fetch only: never Kapso.

const PHONE = '+201000000001';
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function number(id: string, env: WhatsappEnv): OverlayNumber {
  return {
    id, label: id, purpose: 'chat', phone_number_id: `pid-${id}`, waba_id: null, enabled: true,
    is_default: true, fallback_rank: 0, created_at: '2026-10-01T00:00:00Z', env, appSecret: null,
  };
}

function holdWith(fetch: Mock<FetchLike>) {
  const numbers = [number('k', KAPSO_ENV), number('m', STUB_ENV), number('c', CRM_ENV)];
  setNumbersOverlay({ values: {}, numberIds: { chat: 'k' }, numbers });
  const hold = new KapsoHold();
  hold.fetch = fetch;
  return hold;
}

const at = (numberId: string) => ({ phone: PHONE, line: 'chat' as const, route: { numberId, line: 'chat' as const } });

afterEach(() => setNumbersOverlay(null));

describe('KapsoHold.reopen', () => {
  it('a Kapso number: lists the phone\'s conversations, PATCHes the ended one to active', async () => {
    const fetch = vi.fn<FetchLike>()
      .mockResolvedValueOnce(reply(200, { data: [{ id: 'c-1', status: 'ended' }] }))
      .mockResolvedValueOnce(reply(200, { data: { id: 'c-1', status: 'active' } }));
    await expect(holdWith(fetch).reopen(at('k'))).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[1] ?? [];
    expect(String(url)).toMatch(/\/platform\/v1\/whatsapp\/conversations\/c-1$/);
    expect(init).toMatchObject({ method: 'PATCH' });
  });

  it('no Kapso conversation known for the phone: no PATCH', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValueOnce(reply(200, { data: [] }));
    await expect(holdWith(fetch).reopen(at('k'))).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('a Meta or CRM number, or no chat line at all (legacy, unset): no Kapso call', async () => {
    const fetch = vi.fn<FetchLike>();
    const hold = holdWith(fetch);
    await expect(hold.reopen(at('m'))).resolves.toBeNull();
    await expect(hold.reopen(at('c'))).resolves.toBeNull();
    await expect(hold.reopen(at('unknown'))).resolves.toBeNull();
    setNumbersOverlay(null);
    await expect(hold.reopen({ phone: PHONE, line: 'chat' })).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a Kapso failure answers its text (for error_text), never throws, never the key or phone', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(503, {}));
    const text = await holdWith(fetch).reopen(at('k'));
    expect(text).toMatch(/^kapso conversation reopen failed: /);
    expect(text).not.toContain(KAPSO_ENV.apiKey);
    expect(text).not.toContain('201000000001');
    expect((text ?? '').length).toBeLessThanOrEqual(200);
  });
});
