import { describe, expect, it } from 'vitest';
import type { PaymentAttachments } from './payment-attachments.service';
import { PaymentFiles } from './payment-files';
import type { ReceiptsService } from './receipts.service';

// docs/45 §6: a row the move marked «minio:» while a form still holds its old unmarked path.

const SUB = '11111111-1111-4111-8111-111111111111';
const ROW = { id: 'p1', subscription_id: SUB, receipt_path: `minio:${SUB}/a.jpg` };

function files(stored: string[] = []) {
  const checked: string[] = [];
  const saved: string[] = [];
  const receipts = {
    check: (i: { path: string }) => Promise.resolve(void checked.push(i.path)),
  } as unknown as ReceiptsService;
  const attachments = {
    paths: () => Promise.resolve(stored),
    check: (i: { paths: string[] }) => Promise.resolve(i.paths.map((path) => ({ path }))),
    save: (_id: string, f: { path: string }[]) =>
      Promise.resolve(void saved.push(...f.map((x) => x.path))),
  } as unknown as PaymentAttachments;
  return { files: new PaymentFiles(receipts, attachments), checked, saved };
}

describe('PaymentFiles and moved files (docs/45 §6)', () => {
  it('the old path sent back keeps the row\'s «minio:» path (no replacement, no discard)', async () => {
    const { files: f, checked } = files();
    const patch = await f.checkPatch(ROW, { receiptPath: `${SUB}/a.jpg` });
    expect(patch.receiptPath).toBe(ROW.receipt_path);
    expect(checked).toEqual([ROW.receipt_path]);
  });

  it('another file is still a replacement', async () => {
    const { files: f } = files();
    const patch = await f.checkPatch(ROW, { receiptPath: `${SUB}/b.jpg` });
    expect(patch.receiptPath).toBe(`${SUB}/b.jpg`);
  });

  it('a replayed form never saves a moved attachment again under its old path', async () => {
    const { files: f, saved } = files([`minio:${SUB}/x.jpg`]);
    const row = { id: 'p1', subscription_id: SUB, method: 'bank' as const };
    await f.saveLate(row, { subscriptionId: SUB, attachments: [`${SUB}/x.jpg`] }, 'actor');
    expect(saved).toEqual([]);
  });
});
