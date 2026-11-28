import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { SHORT_LINK_GATE_KEY, shortLinkGateCalls } from '../short-link-gate-calls';
import { gateView } from '../../short-links.test-util';

const reading = (answer: () => Promise<unknown>) =>
  ({ apiFetch: vi.fn(answer), apiSend: vi.fn() }) as unknown as ApiClient;

const sending = (answer: unknown) =>
  ({ apiFetch: vi.fn(), apiSend: vi.fn(async () => answer) }) as unknown as ApiClient;

const failingWith = (status: number) =>
  reading(async () => {
    throw new ApiError(status, { code: 'short_link_not_found' });
  });

describe('the gate view', () => {
  it('answers the parsed view', async () => {
    const client = reading(async () => gateView);
    const q = shortLinkGateCalls(client).viewQuery('K7q2M9xT');
    expect(q.queryKey).toEqual([...SHORT_LINK_GATE_KEY, 'K7q2M9xT']);
    await expect(q.queryFn()).resolves.toEqual({ kind: 'view', view: gateView });
    expect(client.apiFetch).toHaveBeenCalledWith('/public/short-links/K7q2M9xT');
  });

  it('turns a 404 into not_found', async () => {
    const q = shortLinkGateCalls(failingWith(404)).viewQuery('K7q2M9xT');
    await expect(q.queryFn()).resolves.toEqual({ kind: 'not_found' });
  });

  it('never asks for a malformed code', async () => {
    const client = reading(async () => gateView);
    const q = shortLinkGateCalls(client).viewQuery('bad/code');
    await expect(q.queryFn()).resolves.toEqual({ kind: 'not_found' });
    expect(client.apiFetch).not.toHaveBeenCalled();
  });

  it('keeps any other failure an error', async () => {
    const q = shortLinkGateCalls(failingWith(500)).viewQuery('K7q2M9xT');
    await expect(q.queryFn()).rejects.toThrow('API 500');
  });
});

describe('the gate writes', () => {
  it('opens signed in and through a WhatsApp code', async () => {
    const client = sending({ outcome: 'open', target: 'https://meet.google.com/x' });
    const gate = shortLinkGateCalls(client);
    await expect(gate.open('K7q2M9xT')).resolves.toEqual({
      outcome: 'open', target: 'https://meet.google.com/x',
    });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/open', undefined,
    );
    await gate.otpVerify({ code: 'K7q2M9xT', phone: '+966500000004', otp: '123456' });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/otp/verify', { phone: '+966500000004', code: '123456' },
    );
  });

  it('starts a code with the phone only', async () => {
    const client = sending(undefined);
    await shortLinkGateCalls(client).otpStart({ code: 'K7q2M9xT', phone: '+966500000004' });
    expect(client.apiSend).toHaveBeenCalledWith(
      'POST', '/public/short-links/K7q2M9xT/otp/start', { phone: '+966500000004' },
    );
  });

  it('rejects an outcome the schema does not know', async () => {
    await expect(shortLinkGateCalls(sending({ outcome: 'maybe' })).open('K7q2M9xT')).rejects
      .toThrow();
  });
});
