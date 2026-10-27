import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { KAPSO_ENV } from '../../whatsapp/drivers/kapso/kapso.fakes';
import { STUB_ENV } from '../../whatsapp/whatsapp.fakes';
import { kapsoReopen, last4 } from './kapso-reopener';

// Fakes only: never Kapso.

const PHONE = '+201000000001';
const quiet = () => {
  const log = new Logger('t');
  return { log, warn: vi.spyOn(log, 'warn').mockImplementation(() => undefined) };
};

describe('kapsoReopen', () => {
  it('a chat line not on kapso (meta, or none): no call at all', async () => {
    const fetch = vi.fn();
    const { log } = quiet();
    expect(await kapsoReopen({ phone: PHONE, readEnv: () => STUB_ENV, fetch }, log)).toBe(false);
    expect(await kapsoReopen({ phone: PHONE, readEnv: () => null, fetch }, log)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a Kapso failure answers false and logs only the last 4 digits, never the key', async () => {
    const { log, warn } = quiet();
    const fetch = vi.fn(async () => new Response('{}', { status: 503 }));
    expect(await kapsoReopen({ phone: PHONE, readEnv: () => KAPSO_ENV, fetch }, log)).toBe(false);
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toContain('…0001');
    expect(line).not.toContain('201000000001');
    expect(line).not.toContain(KAPSO_ENV.apiKey);
  });

  it('a Kapso that never answers: false at the deadline, and the call is aborted', async () => {
    const { log, warn } = quiet();
    let signal: AbortSignal | null | undefined;
    // Ignores its signal on purpose: the deadline alone must end it.
    const fetch = vi.fn((_url: string, init: RequestInit) => {
      signal = init.signal;
      return new Promise<Response>(() => undefined);
    });
    expect(await kapsoReopen({ phone: PHONE, readEnv: () => KAPSO_ENV, fetch, timeoutMs: 20 }, log)).toBe(false);
    expect(signal?.aborted).toBe(true);
    expect(String(warn.mock.calls[0]?.[0])).toContain('timed out');
  });

  it('a throwing env read is a Kapso failure: false, never a throw', async () => {
    const { log, warn } = quiet();
    const readEnv = () => {
      throw new Error('bad env');
    };
    expect(await kapsoReopen({ phone: PHONE, readEnv, fetch: vi.fn() }, log)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('bad env');
  });

  it('last4', () => {
    expect(last4('+966 50 123 4567')).toBe('…4567');
  });
});
