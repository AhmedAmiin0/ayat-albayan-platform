import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import type { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import type { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { NOW, staffText, windowFakes } from './window.fakes';

// The worker and the window together (owner 2026-11-03). Fakes only: never Kapso, never Meta.

const KAPSO_422 = new WaError('WhatsApp HTTP 422', {
  code: null,
  status: 422,
  details: '{"error":"Cannot send non-template messages outside the 24-hour window."}',
});
const queries = {
  claim: vi.fn(),
  sent: vi.fn(),
  failure: vi.fn(),
  expire: vi.fn(),
  staffAtSend: vi.fn(),
};
const dispatch = { send: vi.fn(), ready: vi.fn(() => true), multi: true };
const push = { notifyAdmins: vi.fn() };
let f = windowFakes();

function worker() {
  const w = new MessageWorker(
    queries as unknown as SenderRepo,
    dispatch as unknown as MessageDispatch,
    push as unknown as PushService,
  );
  // The property is injected by Nest (@Optional @Inject); a test sets it the same way.
  Reflect.set(w, 'window', f.hold);
  return w;
}
const process = (row = staffText()) =>
  worker().process({ row, template: null, now: NOW, autoOn: true });

describe('MessageWorker with the chat window', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    f = windowFakes();
    queries.claim.mockResolvedValue(1);
    dispatch.ready.mockReturnValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
  });

  it('window open (no marker): a plain send, no template, nothing held', async () => {
    await expect(process(staffText({ error_code: null }))).resolves.toBe('sent');
    expect(dispatch.send).toHaveBeenCalledOnce();
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it('queued after the window: never sent as free text, one template queued, the text held', async () => {
    await expect(process()).resolves.toBe('waiting');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.claim).not.toHaveBeenCalled();
    expect(f.repo.queueReopen).toHaveBeenCalledOnce();
  });

  it('Kapso 422 on a staff chat text: held, not retried and not failed', async () => {
    dispatch.send.mockRejectedValue(KAPSO_422);
    await expect(process(staffText({ error_code: null }))).resolves.toBe('waiting');
    expect(dispatch.send).toHaveBeenCalledOnce();
    expect(queries.failure).not.toHaveBeenCalled();
    expect(f.repo.hold).toHaveBeenCalledOnce();
  });

  it("Meta 131047 on a teacher's text: failed window_closed at once, no template", async () => {
    dispatch.send.mockRejectedValue(
      new WaError('Re-engagement message', { code: 131047, status: 400 }),
    );
    const teacher = staffText({ error_code: null, sent_by_teacher_id: 't1' });
    await expect(process(teacher)).resolves.toBe('failed');
    expect(queries.failure).toHaveBeenCalledWith(
      teacher.id,
      expect.objectContaining({
        status: 'failed',
        next_attempt_at: null,
        error_code: 'window_closed',
      }),
    );
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it('the line cannot send to this phone (allow-list): nothing sent, nothing queued', async () => {
    dispatch.ready.mockReturnValue(false);
    f.dispatch.ready.mockReturnValue(false);
    await expect(process()).resolves.toBe('skipped');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it('release() asks the window; without one (unit tests) it releases nothing', async () => {
    await expect(worker().release()).resolves.toBe(0);
    expect(f.repo.waiting).toHaveBeenCalledOnce();
    const bare = new MessageWorker(
      queries as unknown as SenderRepo,
      dispatch as unknown as MessageDispatch,
      push as unknown as PushService,
    );
    await expect(bare.release()).resolves.toBe(0);
  });
});
