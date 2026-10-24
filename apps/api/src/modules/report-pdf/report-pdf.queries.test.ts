import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { ReportPdfQueries } from './report-pdf.queries';
import type { ReportReadyMessage } from './report-ready';

const T = 'lesson_reports';
const message = {
  dedup_key: 'report_ready:r1',
  template_params: { '1': 'سلمى', '2': 'x', document: { bucket: 'reports', path: 's/l.pdf', filename: 'f.pdf' } },
} as ReportReadyMessage;

function eqs(calls: { table: string; method: string; args: unknown[] }[], table = T) {
  return calls.filter((c) => c.table === table && c.method === 'eq').map((c) => c.args);
}

describe('ReportPdfQueries — the pdf_status queue, compare-and-set (docs/11 §5)', () => {
  it('recoverStale: rendering rows older than the cut-off go back to pending', async () => {
    const { db, calls, argsOf } = fakeDb({ [T]: [{ data: [{ id: 'a' }, { id: 'b' }] }] });
    await expect(new ReportPdfQueries(db).recoverStale(new Date('2026-10-02T07:50:00Z'))).resolves.toBe(2);
    expect(argsOf(T, 'update')).toEqual([{ pdf_status: 'pending' }]);
    expect(eqs(calls)).toEqual([['pdf_status', 'rendering']]);
    expect(argsOf(T, 'lt')).toEqual(['updated_at', '2026-10-02T07:50:00.000Z']);
  });

  it('pendingIds: submitted + pending, oldest first, limited', async () => {
    const { db, calls, argsOf } = fakeDb({ [T]: [{ data: [{ id: 'a' }] }] });
    await expect(new ReportPdfQueries(db).pendingIds(20)).resolves.toEqual(['a']);
    expect(eqs(calls)).toEqual([
      ['status', 'submitted'],
      ['pdf_status', 'pending'],
    ]);
    expect(argsOf(T, 'order')).toEqual(['updated_at', { ascending: true }]);
    expect(argsOf(T, 'limit')).toEqual([20]);
  });

  it('claim: pending → rendering for this id only; returns the claimed version', async () => {
    const { db, calls, argsOf } = fakeDb({ [T]: [{ data: { version: 2 } }, { data: null }] });
    const q = new ReportPdfQueries(db);
    await expect(q.claim('r1')).resolves.toBe(2);
    expect(argsOf(T, 'update')).toEqual([{ pdf_status: 'rendering', pdf_error: null }]);
    expect(eqs(calls).slice(0, 3)).toEqual([
      ['id', 'r1'],
      ['status', 'submitted'],
      ['pdf_status', 'pending'],
    ]);
    await expect(q.claim('r1')).resolves.toBeNull();
  });

  it('finish ready: only the claimed version while still rendering; false when it changed', async () => {
    const { db, calls, argsOf } = fakeDb({ [T]: [{ data: [{ id: 'r1' }] }, { data: [] }] });
    const q = new ReportPdfQueries(db);
    await expect(q.finish({ id: 'r1', version: 2, status: 'ready', path: 's/l.pdf' })).resolves.toBe(true);
    expect(argsOf(T, 'update')).toEqual([{ pdf_status: 'ready', pdf_path: 's/l.pdf', pdf_error: null }]);
    expect(eqs(calls)).toEqual([
      ['id', 'r1'],
      ['pdf_status', 'rendering'],
      ['version', 2],
    ]);
    await expect(q.finish({ id: 'r1', version: 2, status: 'failed', error: 'boom' })).resolves.toBe(false);
  });

  it('finish failed keeps the error for the admin retry screen', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [{ id: 'r1' }] }] });
    await new ReportPdfQueries(db).finish({ id: 'r1', version: 1, status: 'failed', error: 'boom' });
    expect(calls.find((c) => c.method === 'update')?.args).toEqual([{ pdf_status: 'failed', pdf_error: 'boom' }]);
  });

  it('finish pending (held): back in the queue, same version guard, no error kept', async () => {
    const { db, calls } = fakeDb({ [T]: [{ data: [{ id: 'r1' }] }] });
    await expect(new ReportPdfQueries(db).finish({ id: 'r1', version: 4, status: 'pending' })).resolves.toBe(true);
    expect(calls.find((c) => c.method === 'update')?.args).toEqual([{ pdf_status: 'pending' }]);
    expect(eqs(calls)).toEqual([['id', 'r1'], ['pdf_status', 'rendering'], ['version', 4]]);
  });

  it('queueMessage: insert-or-ignore on dedup_key, then fill the document of a still-queued row', async () => {
    const { db, calls } = fakeDb({ messages: [{}, {}] });
    await new ReportPdfQueries(db).queueMessage(message);
    const m = calls.filter((c) => c.table === 'messages');
    expect(m[0]).toEqual({
      table: 'messages',
      method: 'upsert',
      args: [message, { onConflict: 'dedup_key', ignoreDuplicates: true }],
    });
    expect(m[1]?.args).toEqual([{ template_params: message.template_params }]);
    expect(eqs(calls, 'messages')).toEqual([
      ['dedup_key', 'report_ready:r1'],
      ['status', 'queued'],
    ]);
  });

  it('turns a DB error into a thrown error (the job retries, then marks failed)', async () => {
    const { db } = fakeDb({ [T]: [{ error: { message: 'down' } }], messages: [{ error: { message: 'x' } }] });
    const q = new ReportPdfQueries(db);
    await expect(q.claim('r1')).rejects.toThrow('PDF claim failed: down');
    await expect(q.queueMessage(message)).rejects.toThrow('report_ready queue failed: x');
  });
});
