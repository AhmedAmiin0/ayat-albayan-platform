import { describe, expect, it } from 'vitest';
import { assistantPayRoutes } from '../assistant-pay.routes';
import { assistantStatementRoutes } from '../assistant-statements.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});
const pay = (permission: string) => ({ permissions: [permission], tags: ['assistant-pay'] });

describe('assistantPayRoutes: access', () => {
  it('lets readers see terms, attribution and the ledger', () => {
    const r = assistantPayRoutes;
    for (const route of [r.list, r.get, r.broughtByOf, r.ledger]) {
      expect(accessOf(route)).toEqual(pay('assistantpay.read'));
    }
  });

  it('keeps terms, voiding, adjustments and attribution changes for writers', () => {
    const r = assistantPayRoutes;
    for (const route of [r.setTerms, r.void, r.adjust, r.broughtBy]) {
      expect(accessOf(route)).toEqual(pay('assistantpay.write'));
    }
  });
});

describe('assistantStatementRoutes: access', () => {
  it('lets readers see statements and their receipts', () => {
    const r = assistantStatementRoutes;
    for (const route of [r.list, r.get, r.receipt]) {
      expect(accessOf(route)).toEqual(pay('assistantpay.read'));
    }
  });

  it('keeps generating, paying and the receipt upload for writers', () => {
    const r = assistantStatementRoutes;
    for (const route of [r.generate, r.pay, r.receiptUploadUrl]) {
      expect(accessOf(route)).toEqual(pay('assistantpay.write'));
    }
  });

  it('keeps approving, reopening and unpaying for approvers', () => {
    const r = assistantStatementRoutes;
    for (const route of [r.approve, r.reopen, r.unpay]) {
      expect(accessOf(route)).toEqual(pay('assistantpay.approve'));
    }
  });
});
