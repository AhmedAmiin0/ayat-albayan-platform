import { describe, expect, it } from 'vitest';
import { paymentRoutes } from '../payments.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});
const payments = (permission: string) => ({ permissions: [permission], tags: ['payments'] });

describe('paymentRoutes: access', () => {
  it('lets readers list and open payments, receipts and attachments', () => {
    const r = paymentRoutes;
    for (const route of [r.list, r.get, r.receipt, r.attachments]) {
      expect(accessOf(route)).toEqual(payments('payments.read'));
    }
  });

  it('keeps recording, uploading, editing and deleting for writers', () => {
    const r = paymentRoutes;
    for (const route of [r.create, r.receiptUploadUrl, r.update, r.remove]) {
      expect(accessOf(route)).toEqual(payments('payments.write'));
    }
  });
});
