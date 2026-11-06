import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onSenderWake, resetSenderWake } from '@/common/jobs';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ReportPdfQueries } from './report-pdf.queries';
import type { ReportReadyMessage } from './report-ready';

// docs/42 42-1: report_ready queued by the PDF job wakes the sender (no 30 s poll wait).

const kick = vi.fn(async () => undefined);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const message = { dedup_key: 'report_ready:r1', template_params: { '1': 'x' } } as ReportReadyMessage;

describe('ReportPdfQueries.queueMessage wakes the sender', () => {
  beforeEach(() => onSenderWake(kick));
  afterEach(() => {
    resetSenderWake();
    kick.mockReset();
  });

  it('a queued report_ready row (new or earlier): one wake', async () => {
    const { db, calls } = fakeDb({ messages: [{}, { data: [{ id: 'm1' }] }] });
    await new ReportPdfQueries(db).queueMessage(message);
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
    expect(calls.filter((c) => c.method === 'select').map((c) => c.args)).toEqual([['id']]);
  });

  it('already sent (no still-queued row): no wake', async () => {
    const { db } = fakeDb({ messages: [{}, { data: [] }] });
    await new ReportPdfQueries(db).queueMessage(message);
    await flush();
    expect(kick).not.toHaveBeenCalled();
  });

  it('a failed kick never fails the write', async () => {
    kick.mockRejectedValueOnce(new Error('worker down'));
    const { db } = fakeDb({ messages: [{}, { data: [{ id: 'm1' }] }] });
    await expect(new ReportPdfQueries(db).queueMessage(message)).resolves.toBeUndefined();
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });
});
