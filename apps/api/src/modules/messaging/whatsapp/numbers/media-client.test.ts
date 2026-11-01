import { afterEach, describe, expect, it, vi } from 'vitest';
import { setCallsNumber } from '@/common/configuration/integrations/calls-number';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { MediaNumber } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import type { WhatsappClient, WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import { mediaSource } from './media-client';

// Owner 2026-10-27: a file is fetched by the NUMBER it came in on, never the notifications line by default.
const client = (name: string) => ({ name }) as unknown as WhatsappClient;
const lines = { notifications: client('notifications'), chat: client('chat') } as WhatsappLines;
const none = { client: vi.fn(() => null) };
const CRM: MediaNumber = { id: 'n-old', provider: 'crm', purpose: 'chat' };
const KAPSO: MediaNumber = { id: 'n-chat', provider: 'kapso', purpose: 'chat' };

describe('mediaSource (docs/23c, docs/19)', () => {
  afterEach(() => setNumbersOverlay(null));

  it('the old CRM number: no client at all (the CRM keeps its files), whatever the line says', () => {
    for (const line of [null, 'chat', 'notifications'] as const) {
      expect(mediaSource({ line, number: CRM }, { lines, numbers: none })).toEqual({ kind: 'crm' });
    }
    expect(none.client).not.toHaveBeenCalled();
  });

  it('module mode: the number\'s own client from the registry', () => {
    const own = client('own');
    const numbers = { client: vi.fn((id: string) => (id === 'n-chat' ? own : null)) };
    expect(mediaSource({ line: null, number: KAPSO }, { lines, numbers })).toEqual({ kind: 'client', client: own, line: null });
    expect(numbers.client).toHaveBeenCalledWith('n-chat');
  });

  it('legacy (no registry entry): the row\'s line, else its number\'s role, never notifications for a chat number', () => {
    expect(mediaSource({ line: 'chat', number: null }, { lines, numbers: none })).toMatchObject({ client: lines.chat, line: 'chat' });
    expect(mediaSource({ line: null, number: KAPSO }, { lines, numbers: none })).toMatchObject({ client: lines.chat, line: 'chat' });
  });

  it('a legacy single-line row (no line, no number) keeps the notifications client', () => {
    expect(mediaSource({ line: null }, { lines, numbers: none })).toMatchObject({ client: lines.notifications, line: 'notifications' });
  });

  it('module mode, a number without a client (disabled): none, never the role\'s other number', () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [] });
    expect(mediaSource({ line: 'chat', number: KAPSO }, { lines, numbers: none })).toEqual({ kind: 'none' });
  });
});

describe('mediaSource and the calls number (docs/28 §10)', () => {
  afterEach(() => setCallsNumber(null));
  const env = { provider: 'kapso' as const, base: 'http://stub.test/kapso', version: 'v24.0', phoneNumberId: 'calls-pn', wabaId: 'w', apiKey: 'k' };

  it('a file sent to the calls number is fetched with its own Kapso connection only, never a line\'s', () => {
    setCallsNumber({ id: 'n-calls', phoneNumberId: 'calls-pn', env });
    const got = mediaSource({ line: 'calls', number: { id: 'n-calls', provider: 'kapso', purpose: 'calls' } }, { lines, numbers: none });
    expect(got).toMatchObject({ kind: 'client', line: null });
    expect(got).not.toEqual(expect.objectContaining({ client: lines.chat }));
  });

  it('no usable calls number: none (503), never the notifications line', () => {
    expect(mediaSource({ line: 'calls' }, { lines, numbers: none })).toEqual({ kind: 'none' });
  });
});
