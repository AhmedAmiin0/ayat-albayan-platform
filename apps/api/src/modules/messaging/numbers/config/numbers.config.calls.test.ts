import { afterEach, describe, expect, it, vi } from 'vitest';
import { callsNumber, setCallsNumber } from '@/common/configuration/integrations/calls-number';
import { numbersOverlay, setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { numberRow } from '@/modules/messaging/numbers/numbers.fakes';
import type { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';
import { config } from './numbers.config.fakes';

const CALLS = numberRow({
  id: '00000000-0000-4000-8000-0000000000c1',
  purpose: 'calls',
  provider: 'kapso',
  phone_number_id: '1000000009',
  waba_id: '2000000001',
});

function withCalls(source: 'legacy' | 'module', calls: ReturnType<typeof numberRow> | null) {
  const c = config(
    source,
    vi.fn(async () => [numberRow()]),
    vi.fn(async () => [numberRow(), ...(calls ? [calls] : [])]),
  );
  const queries = (c as unknown as { queries: NumbersRepo }).queries;
  vi.mocked(queries.callsDefault).mockResolvedValue(calls);
  return c;
}

afterEach(() => {
  setCallsNumber(null);
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

describe('NumbersConfig: the dedicated calls number (docs/28 §10)', () => {
  it("legacy loads it too (it is not a messaging line), with Kapso's project key", async () => {
    vi.stubEnv('KAPSO_API_BASE', 'http://stub.test/kapso');
    vi.stubEnv('KAPSO_API_KEY', 'kapso-fake');
    expect(await withCalls('legacy', CALLS).refresh()).toBe(true);
    expect(numbersOverlay()).toBeNull();
    expect(callsNumber()).toMatchObject({
      id: CALLS.id,
      phoneNumberId: '1000000009',
      env: { provider: 'kapso', phoneNumberId: '1000000009', apiKey: 'kapso-fake' },
    });
  });

  it('none: null, so calls ring on the chat line as before', async () => {
    setCallsNumber({ id: 'old', phoneNumberId: 'x', env: null });
    await withCalls('legacy', null).refresh();
    expect(callsNumber()).toBeNull();
  });

  it('module mode: never a line key, never sendable (env null), still listed for inbound', async () => {
    await withCalls('module', CALLS).refresh();
    expect(numbersOverlay()?.numberIds).toEqual({ notifications: numberRow().id });
    const listed = numbersOverlay()?.numbers?.find((n) => n.id === CALLS.id);
    expect(listed).toMatchObject({ purpose: 'calls', env: null, appSecret: null });
  });

  it('a calls row among the role defaults never supplies a WA_* key', async () => {
    const c = config(
      'module',
      vi.fn(async () => [numberRow(), CALLS]),
    );
    await c.refresh();
    expect(numbersOverlay()?.values.WA_CHAT_PHONE_NUMBER_ID).toBe('');
    expect(Object.values(numbersOverlay()?.values ?? {})).not.toContain('1000000009');
  });

  it('a meta-provider or WABA-less calls row cannot carry a call (env null)', async () => {
    await withCalls('legacy', { ...CALLS, provider: 'meta' }).refresh();
    expect(callsNumber()?.env).toBeNull();
  });

  it('a failed calls read keeps the current calls number and never fails the numbers refresh', async () => {
    const kept = { id: 'kept', phoneNumberId: 'x', env: null };
    setCallsNumber(kept);
    const c = withCalls('module', null);
    const queries = (c as unknown as { queries: NumbersRepo }).queries;
    vi.mocked(queries.callsDefault).mockRejectedValueOnce(
      new Error('invalid input value for enum wa_line'),
    );
    expect(await c.refresh()).toBe(true);
    expect(callsNumber()).toEqual(kept);
    expect(numbersOverlay()?.numberIds).toEqual({ notifications: numberRow().id });
  });
});
