import { describe, expect, it } from 'vitest';
import { moveStores } from './move.fakes';
import { placeInMinio } from './place';

const o = { bucket: 'receipts' as const, key: 's/a.pdf' };

describe('placeInMinio: copy, then verify (docs/45 §6)', () => {
  it('copies under the same key with the same type, and verifies it', async () => {
    const { to, stores } = await moveStores([o.key]);
    expect(await placeInMinio(stores, o)).toBe('copied');
    expect(await to.store.info(o)).toEqual({ size: 16, contentType: 'application/pdf' });
    expect(await placeInMinio(stores, o)).toBe('present');
  });

  it('a missing source object is reported, nothing is written', async () => {
    const { to, stores } = await moveStores([]);
    expect(await placeInMinio(stores, o)).toBe('missing');
    expect(to.objects.size).toBe(0);
  });

  it('another object under the key in MinIO (a newer re-render) is kept: mismatch', async () => {
    const { to, stores } = await moveStores([o.key]);
    const newer = new TextEncoder().encode('%PDF-1.7 re-rendered, longer');
    await to.store.put({ ...o, body: newer, contentType: 'application/pdf' });
    expect(await placeInMinio(stores, o)).toBe('mismatch');
    expect(await to.store.get(o)).toEqual(newer);
  });

  it('same size, other bytes: the checksum catches it', async () => {
    const { to, stores } = await moveStores([o.key]);
    const other = new TextEncoder().encode('%PDF-1.7 RECEIPT');
    await to.store.put({ ...o, body: other, contentType: 'application/pdf' });
    expect(await placeInMinio(stores, o)).toBe('mismatch');
  });

  it('another Content-Type in MinIO: mismatch', async () => {
    const { to, from, stores } = await moveStores([o.key]);
    const body = (await from.store.get(o)) ?? new Uint8Array();
    await to.store.put({ ...o, body, contentType: 'image/png' });
    expect(await placeInMinio(stores, o)).toBe('mismatch');
  });

  it('an object over the size cap is left alone', async () => {
    const { to, stores } = await moveStores([o.key]);
    expect(await placeInMinio({ ...stores, maxBytes: 8 }, o)).toBe('too_large');
    expect(to.objects.size).toBe(0);
  });
});
