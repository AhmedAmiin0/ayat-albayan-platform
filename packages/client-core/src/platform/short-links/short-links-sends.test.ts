import {
  shortLinkDetailSchema,
  shortLinkSentDetailSchema,
  type ShortLinkCreate,
} from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { parseResponse, type ApiClient } from '../../core/http';
import { shortLinkSends } from './short-links-sends';
import { detail } from './short-links.test-util';

const sentDetail = { ...detail, send: { queued: 1, failed: 1 } };

const options = z.object({ schema: z.custom<z.ZodType>((s) => s instanceof z.ZodType) });

/** apiSend as the real client runs it: the options' schema parses the answer. */
const clientAnswering = (answer: unknown) => {
  const send = async (_method: string, path: string, arg?: unknown) => {
    const withSchema = options.safeParse(arg);
    return withSchema.success ? parseResponse(withSchema.data.schema, answer, path) : answer;
  };
  return { apiFetch: vi.fn(), apiSend: vi.fn(send) } as unknown as ApiClient;
};
const sent = { schema: shortLinkSentDetailSchema };
const answered = { schema: shortLinkDetailSchema };

describe('short link writes', () => {
  it('creates and resends with the send counts', async () => {
    const client = clientAnswering(sentDetail);
    const sends = shortLinkSends(client);
    const body: ShortLinkCreate = {
      title: 't', targetUrl: 'https://meet.google.com/x', maxUsers: null, audience: 'anyone',
      profileIds: [], phones: [], sendWhatsapp: false,
    };
    await expect(sends.create(body)).resolves.toEqual(sentDetail);
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/short-links', { body, ...sent });
    await expect(sends.resend('K7q2M9xT')).resolves.toEqual(sentDetail);
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/resend', {
      body: undefined,
      ...sent,
    });
  });

  it('updates and revokes, answering the detail', async () => {
    const client = clientAnswering(detail);
    const sends = shortLinkSends(client);
    await expect(sends.update({ code: 'K7q2M9xT', body: { title: 'x' } })).resolves.toEqual(detail);
    expect(client.apiSend).toHaveBeenCalledWith('PATCH', '/short-links/K7q2M9xT', {
      body: { title: 'x' },
      ...answered,
    });
    await sends.revoke('K7q2M9xT');
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/revoke', {
      body: undefined,
      ...answered,
    });
  });

  it('opens signed in and through a WhatsApp code', async () => {
    const client = clientAnswering({ outcome: 'open', target: 'https://meet.google.com/x' });
    const sends = shortLinkSends(client);
    await expect(sends.open('K7q2M9xT')).resolves.toEqual({
      outcome: 'open', target: 'https://meet.google.com/x',
    });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/open', undefined,
    );
    await sends.otpVerify({ code: 'K7q2M9xT', phone: '+966500000004', otp: '123456' });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/otp/verify', { phone: '+966500000004', code: '123456' },
    );
  });

  it('starts a code with the phone only', async () => {
    const client = clientAnswering(undefined);
    await shortLinkSends(client).otpStart({ code: 'K7q2M9xT', phone: '+966500000004' });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/otp/start', { phone: '+966500000004' },
    );
  });

  it('rejects an outcome the schema does not know', async () => {
    const client = clientAnswering({ outcome: 'maybe' });
    await expect(shortLinkSends(client).open('K7q2M9xT')).rejects.toThrow();
  });
});
