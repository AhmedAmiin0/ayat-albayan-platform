import { describe, expect, it, vi } from 'vitest';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { ReopenCancel } from '@/modules/messaging/whatsapp/sender/window/manual-send';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { MessageViews } from './message.views';
import { MessagesRepo } from './messages.repo';
import { MessagesService } from './messages.service';

// «أرسل عبر واتساب» (owner 2026-11-06): the mark (sent-manually) cancels the family's queued reopen
// template; its «تراجع» goes through retry: sent_manually → queued while no app echo is attached.

type Row = ReturnType<typeof messageRow>;

function setup(row: Row, after: Row | null = { ...row, status: 'sent_manually' }) {
  const queries = {
    get: vi.fn().mockResolvedValue(row),
    markSentManually: vi.fn().mockResolvedValue(after),
    unsend: vi.fn().mockResolvedValue(after && { ...after, status: 'queued' }),
    requeue: vi.fn(),
  };
  const reopens = { afterManualSend: vi.fn().mockResolvedValue('none') };
  const sender = { kick: vi.fn(async () => undefined) };
  const svc = new MessagesService(
    queries as unknown as MessagesRepo,
    { view: vi.fn(async (r: unknown) => r) } as unknown as MessageViews,
    sender as unknown as MessageSender,
    reopens as unknown as ReopenCancel,
  );
  return { svc, queries, reopens, sender };
}

const heldText = () => messageRow({ status: 'queued', error_code: 'awaiting_reply', body: 'نص', template_key: null });

describe('MessagesService.sentManually: the reopen cancel', () => {
  it('after the mark, with the row as it was', async () => {
    const row = heldText();
    const s = setup(row);
    await s.svc.sentManually(row.id);
    expect(s.queries.markSentManually).toHaveBeenCalled();
    expect(s.reopens.afterManualSend).toHaveBeenCalledWith(row);
  });

  it('a refused mark (claimed meanwhile): 409, nothing cancelled', async () => {
    const row = heldText();
    const s = setup(row, null);
    await expect(s.svc.sentManually(row.id)).rejects.toMatchObject({ status: 409 });
    expect(s.reopens.afterManualSend).not.toHaveBeenCalled();
  });
});

describe('MessagesService.retry of a sent_manually row («تراجع», ?undo=whatsapp)', () => {
  const undo = { automaticOn: true, undo: true };
  const marked = (over: Partial<Row> = {}) =>
    messageRow({ status: 'sent_manually', sent_manually_at: new Date().toISOString(), ...over });

  it('back to the queue through unsend, the sender kicked', async () => {
    const row = marked();
    const s = setup(row);
    await expect(s.svc.retry(row.id, undo)).resolves.toMatchObject({ view: { status: 'queued' } });
    expect(s.queries.unsend).toHaveBeenCalledWith(row.id, { since: expect.any(Date), wamid: null });
    expect(s.queries.requeue).not.toHaveBeenCalled();
    expect(s.sender.kick).toHaveBeenCalled();
  });

  it('a stale plain retry (another screen) never undoes a manual send: 409', async () => {
    const s = setup(marked());
    await expect(s.svc.retry('m1', { automaticOn: true })).rejects.toMatchObject({ status: 409 });
    expect(s.queries.unsend).not.toHaveBeenCalled();
  });

  it('the app echo is on it, or a calls-line row: 409, nothing read back', async () => {
    const echoed = marked({ wa_message_id: 'wamid.APP1', sent_at: new Date(Date.now() + 1000).toISOString() });
    for (const row of [echoed, marked({ line: 'calls' })]) {
      const s = setup(row);
      await expect(s.svc.retry(row.id, undo)).rejects.toMatchObject({ status: 409 });
      expect(s.queries.unsend).not.toHaveBeenCalled();
    }
  });

  it('an old wamid from before the mark (failed after WhatsApp took it): undone on that wamid', async () => {
    const row = marked({ wa_message_id: 'wamid.OLD', sent_at: '2026-11-01T09:00:00.000Z' });
    const s = setup(row);
    await s.svc.retry(row.id, undo);
    expect(s.queries.unsend).toHaveBeenCalledWith(row.id, expect.objectContaining({ wamid: 'wamid.OLD' }));
  });

  it('too late or the echo landed meanwhile (unsend null): 409 not_retryable, no kick', async () => {
    const row = marked();
    const s = setup(row, null);
    await expect(s.svc.retry(row.id, undo)).rejects.toMatchObject({ status: 409 });
    expect(s.sender.kick).not.toHaveBeenCalled();
  });

  it('undo on a failed or queued row: 409', async () => {
    for (const status of ['failed', 'queued'] as const) {
      const s = setup(messageRow({ status }));
      await expect(s.svc.retry('m1', undo)).rejects.toMatchObject({ status: 409 });
    }
  });
});

describe('MessagesRepo.unsend', () => {
  it('compare-and-set: still sent_manually, the same (no) wamid, a staff row, marked since', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: null }] });
    await new MessagesRepo(db).unsend('m1', { since: new Date('2026-11-06T10:00:00Z'), wamid: null });
    const f = calls.map((c) => [c.method, ...c.args]);
    expect(f).toContainEqual(['update', expect.objectContaining({ status: 'queued', sent_manually_at: null, attempts: 0 })]);
    expect(f).toContainEqual(['eq', 'status', 'sent_manually']);
    expect(f).toContainEqual(['is', 'wa_message_id', null]);
    expect(f).toContainEqual(['not', 'created_by', 'is', null]);
    expect(f).toContainEqual(['gte', 'sent_manually_at', '2026-11-06T10:00:00.000Z']);
  });
});
