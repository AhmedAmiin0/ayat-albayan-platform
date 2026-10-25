import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../common/integrations/numbers-overlay';
import type { StorageService } from '../../common/storage/storage.service';
import { MessageDispatch } from './message.dispatch';
import type { NumberClients } from './numbers/number-clients';
import { N1, N2 } from './numbers/number-route.fakes';
import { dueMessage } from './sender.fakes';
import { templateRow } from './whatsapp.fakes';
import type { WhatsappLines } from './whatsapp.types';

// docs/23c: a routed row leaves through its number's own client; the line clients are never used for it.

const client = () => ({ configured: vi.fn(() => true), sendTemplate: vi.fn(async () => ({ waMessageId: 'wamid.x' })), sendText: vi.fn() });
const storage = { signedDownload: vi.fn() } as unknown as StorageService;

function setup() {
  const lines = { notifications: client(), chat: client() };
  const own = client();
  const d = new MessageDispatch(lines as unknown as WhatsappLines, storage);
  const numbers = { client: vi.fn((id: string) => (id === N2 ? own : null)) };
  Object.assign(d, { numbers: numbers as unknown as NumberClients });
  return { d, lines, own, numbers };
}

afterEach(() => setNumbersOverlay(null));

describe('MessageDispatch — a number route', () => {
  it('sends through the number\'s own client, never a line client', async () => {
    const { d, lines, own } = setup();
    await expect(d.send(dueMessage(), templateRow(), { numberId: N2, line: 'notifications' })).resolves.toEqual({ waMessageId: 'wamid.x' });
    expect(own.sendTemplate).toHaveBeenCalledTimes(1);
    expect(lines.notifications.sendTemplate).not.toHaveBeenCalled();
  });

  it('a number without a client is not ready, and a send through it is refused before any request', async () => {
    const { d } = setup();
    expect(d.ready(dueMessage(), { numberId: N1, line: 'notifications' })).toBe(false);
    await expect(d.send(dueMessage(), templateRow(), { numberId: N1, line: 'notifications' })).rejects.toThrow('WhatsApp is not configured');
  });

  it('a line keeps today\'s client and never asks the number clients', async () => {
    const { d, lines, numbers } = setup();
    expect(d.ready(dueMessage(), 'notifications')).toBe(true);
    await d.send(dueMessage(), templateRow(), 'notifications');
    expect(lines.notifications.sendTemplate).toHaveBeenCalledTimes(1);
    expect(numbers.client).not.toHaveBeenCalled();
  });
});
