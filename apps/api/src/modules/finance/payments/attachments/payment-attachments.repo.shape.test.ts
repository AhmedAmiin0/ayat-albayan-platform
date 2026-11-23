import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PaymentAttachmentsRepo } from './payment-attachments.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsOn = (calls: Calls, table: string, method: string) =>
  calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

const boom = { code: 'XX000', message: 'boom' };

describe('PaymentAttachmentsRepo.forPayment', () => {
  it('five columns of that payment, oldest first then id, one trip', async () => {
    const rows = [{ id: 'f1', path: 'p/1.pdf' }];
    const { db, calls, trips } = fakeDb({ payment_attachments: [{ data: rows }] });
    expect(await new PaymentAttachmentsRepo(db).forPayment('pay1')).toBe(rows);
    expect(trips).toEqual(['payment_attachments']);
    const t = 'payment_attachments';
    expect(argsOn(calls, t, 'select')).toEqual([['id, path, mime, size, created_at']]);
    expect(argsOn(calls, t, 'eq')).toEqual([['payment_id', 'pay1']]);
    expect(argsOn(calls, t, 'order')).toEqual([['created_at'], ['id']]);
  });

  it('a database error is thrown', async () => {
    const { db } = fakeDb({ payment_attachments: [{ error: boom }] });
    await expect(new PaymentAttachmentsRepo(db).forPayment('p')).rejects.toThrow('boom');
  });
});

describe('PaymentAttachmentsRepo.owners: both stored forms, two tables in parallel', () => {
  it('no path: no trip, an empty list', async () => {
    const { db, trips } = fakeDb({});
    expect(await new PaymentAttachmentsRepo(db).owners([])).toEqual([]);
    expect(trips).toEqual([]);
  });

  it('asks both tables with the plain and «minio:» form of each path, deduped', async () => {
    const { db, calls, trips } = fakeDb({
      payment_attachments: [{ data: [{ path: 'a/1.pdf', payment_id: 'p1' }] }],
      payments: [
        {
          data: [
            { id: 'p2', receipt_path: 'minio:b/2.jpg' },
            { id: 'p3', receipt_path: null },
          ],
        },
      ],
    });
    const paths = ['a/1.pdf', 'minio:b/2.jpg', 'a/1.pdf'];
    const out = await new PaymentAttachmentsRepo(db).owners(paths);
    const forms = ['a/1.pdf', 'minio:a/1.pdf', 'b/2.jpg', 'minio:b/2.jpg'];
    expect(trips).toEqual(['payment_attachments', 'payments']);
    expect(argsOn(calls, 'payment_attachments', 'select')).toEqual([['path, payment_id']]);
    expect(argsOn(calls, 'payment_attachments', 'in')).toEqual([['path', forms]]);
    expect(argsOn(calls, 'payments', 'select')).toEqual([['id, receipt_path']]);
    expect(argsOn(calls, 'payments', 'in')).toEqual([['receipt_path', forms]]);
    expect(out).toEqual([
      { path: 'a/1.pdf', paymentId: 'p1' },
      { path: 'minio:b/2.jpg', paymentId: 'p2' },
    ]);
  });

  it('an error on either table is thrown', async () => {
    const files = fakeDb({ payment_attachments: [{ error: boom }], payments: [{ data: [] }] });
    await expect(new PaymentAttachmentsRepo(files.db).owners(['x'])).rejects.toThrow('boom');
    const receipts = fakeDb({ payment_attachments: [{ data: [] }], payments: [{ error: boom }] });
    await expect(new PaymentAttachmentsRepo(receipts.db).owners(['x'])).rejects.toThrow('boom');
  });
});

describe('PaymentAttachmentsRepo.save', () => {
  it('no row: no trip', async () => {
    const { db, trips } = fakeDb({});
    await new PaymentAttachmentsRepo(db).save([]);
    expect(trips).toEqual([]);
  });

  it('one upsert on path that ignores duplicates', async () => {
    const rows = [{ payment_id: 'p1', path: 'a/1.pdf', mime: 'application/pdf' }];
    const { db, calls, trips } = fakeDb({ payment_attachments: [{}] });
    await new PaymentAttachmentsRepo(db).save(rows);
    expect(trips).toEqual(['payment_attachments']);
    expect(argsOn(calls, 'payment_attachments', 'upsert')).toEqual([
      [rows, { onConflict: 'path', ignoreDuplicates: true }],
    ]);
  });

  it('an upsert error is thrown', async () => {
    const { db } = fakeDb({ payment_attachments: [{ error: boom }] });
    const rows = [{ payment_id: 'p1', path: 'a', mime: 'image/png' }];
    await expect(new PaymentAttachmentsRepo(db).save(rows)).rejects.toThrow('boom');
  });
});
