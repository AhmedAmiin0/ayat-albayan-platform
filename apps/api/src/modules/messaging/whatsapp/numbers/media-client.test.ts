import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../../../common/integrations/numbers-overlay';
import type { MediaNumber } from '../messages/inbound-media.queries';
import type { WhatsappClient, WhatsappLines } from '../whatsapp.types';
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
