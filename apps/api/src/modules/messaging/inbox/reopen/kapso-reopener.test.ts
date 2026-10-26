import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { KAPSO_ENV } from '../../whatsapp/drivers/kapso/kapso.fakes';
import { STUB_ENV } from '../../whatsapp/whatsapp.fakes';
import { kapsoReopen, last4 } from './kapso-reopener';

// Fakes only: never Kapso.

const PHONE = '+201000000001';

describe('kapsoReopen', () => {
  it('a chat line not on kapso (meta, or none): no call at all', async () => {
    const fetch = vi.fn();
    const log = new Logger('t');
    expect(await kapsoReopen({ phone: PHONE, env: STUB_ENV, fetch }, log)).toBe(false);
    expect(await kapsoReopen({ phone: PHONE, env: null, fetch }, log)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a Kapso failure answers false and logs only the last 4 digits, never the key', async () => {
    const log = new Logger('t');
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => undefined);
    const fetch = vi.fn(async () => new Response('{}', { status: 503 }));
    expect(await kapsoReopen({ phone: PHONE, env: KAPSO_ENV, fetch }, log)).toBe(false);
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toContain('…0001');
    expect(line).not.toContain('201000000001');
    expect(line).not.toContain(KAPSO_ENV.apiKey);
  });

  it('last4', () => {
    expect(last4('+966 50 123 4567')).toBe('…4567');
  });
});
