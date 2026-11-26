import { describe, expect, it } from 'vitest';
import { recordingFetch } from '@/modules/messaging/whatsapp/drivers/crm/crm-fetch';

describe('recordingFetch', () => {
  it('answers as the transport does and keeps the default text', async () => {
    const t = recordingFetch(async () => new Response('ok'));
    expect(await (await t.fetch('u', {})).text()).toBe('ok');
    expect(t.seen.cause).toBe('fetch failed');
  });

  it('rethrows the same error and keeps its text', async () => {
    const boom = new TypeError('socket hang up');
    const t = recordingFetch(() => Promise.reject(boom));
    await expect(t.fetch('u', {})).rejects.toBe(boom);
    expect(t.seen.cause).toBe('socket hang up');
  });
});
