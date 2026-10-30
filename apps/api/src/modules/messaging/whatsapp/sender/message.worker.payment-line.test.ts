import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatch,
  job,
  LATER,
  NOW,
  payment,
  queries,
  reminder,
  reply,
  repo,
  resetPaymentFakes,
  subjects,
  worker,
} from './message.worker.payment.fakes';

// The review fixes of the 131042 line hold: the 48 h stop, history-sized holds, lift, session
// texts, driver switches (docs/12 §3.3).

const HOUR = 60 * 60_000;
const ago = (ms: number, now = NOW) => new Date(now.getTime() - ms).toISOString();

describe('MessageWorker — 131042 line hold, review fixes', () => {
  beforeEach(resetPaymentFakes);
  afterEach(() => vi.unstubAllEnvs());

  it('a deferred row aged 49 h fails as 131042 (per-row push), never deferred again', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment);
    await w.process(job(reminder('m-1')));
    const old = reminder('m-2', { created_at: ago(49 * HOUR, LATER) });
    await expect(w.process(job(old, LATER))).resolves.toBe('failed');
    expect(repo.defer).not.toHaveBeenCalled();
    expect(dispatch.send).toHaveBeenCalledTimes(1);
    expect(queries.failure).toHaveBeenLastCalledWith('m-2', {
      status: 'failed',
      next_attempt_at: null,
      error_code: '131042',
      error_text: expect.stringContaining('48 h'),
    });
    expect(subjects()).toContain(`m-2:${LATER.getTime()}`);
  });

  it('the first line hold is 30 min even if the probe row is 5 h old', async () => {
    dispatch.send.mockRejectedValueOnce(payment);
    await worker().process(job(reminder('m-1', { created_at: ago(5 * HOUR) })));
    expect(queries.failure).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ next_attempt_at: '2026-10-30T08:30:00.000Z' }),
    );
  });

  it('a probe at 47.5 h is held only to due + 48 h', async () => {
    dispatch.send.mockRejectedValueOnce(payment);
    await worker().process(job(reminder('m-1', { created_at: ago(47.5 * HOUR) })));
    expect(queries.failure).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ next_attempt_at: '2026-10-30T08:30:00.000Z' }),
    );
  });

  it('a send on the line lifts the hold: deferred rows freed, a fresh reminder sends at once', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment).mockResolvedValue({ waMessageId: 'wamid.ok' });
    await w.process(job(reminder('m-1')));
    await expect(w.process(job(reply('t-1'), LATER))).resolves.toBe('sent');
    expect(repo.move).toHaveBeenCalledWith({
      from: ['2026-10-30T08:30:00.000Z', '2026-10-30T08:32:00.000Z'],
      to: LATER.toISOString(),
    });
    await expect(w.process(job(reminder('m-2', { expires_at: ago(-HOUR) }), LATER))).resolves.toBe(
      'sent',
    );
    expect(repo.defer).not.toHaveBeenCalled();
  });

  it('a session text is not line-held; its own 131042 holds that row alone', async () => {
    const w = worker();
    dispatch.send.mockRejectedValue(payment);
    await w.process(job(reminder('m-1')));
    await expect(w.process(job(reply('t-1'), LATER))).resolves.toBe('paused');
    expect(repo.defer).not.toHaveBeenCalled();
    expect(queries.failure).toHaveBeenLastCalledWith(
      't-1',
      expect.objectContaining({ error_code: 'wa_payment_hold' }),
    );
    const fresh = worker();
    await fresh.process(job(reply('t-2')));
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.ok' });
    await expect(fresh.process(job(reminder('m-2'), LATER))).resolves.toBe('sent');
  });

  it('a driver switch drops the hold: the line on crm (or another WABA) sends again', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment).mockResolvedValue({ waMessageId: 'wamid.ok' });
    await w.process(job(reminder('m-1')));
    vi.stubEnv('WA_PROVIDER', 'crm');
    await expect(w.process(job(reminder('m-2'), LATER))).resolves.toBe('sent');
    expect(repo.defer).not.toHaveBeenCalled();
  });
});
