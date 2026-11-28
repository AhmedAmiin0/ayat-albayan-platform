import { describe, expect, it } from 'vitest';
import { mySalesRoutes } from '../my-sales.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});
const sales = (permission: string) => ({ permissions: [permission], tags: ['sales'] });

describe('mySalesRoutes: access', () => {
  it('shows the own students to whoever may see the students they brought', () => {
    expect(accessOf(mySalesRoutes.students)).toEqual(sales('self.sales_students'));
  });

  it('keeps the earnings and commissions behind the own earnings key', () => {
    expect(accessOf(mySalesRoutes.earnings)).toEqual(sales('self.sales_earnings'));
    expect(accessOf(mySalesRoutes.commissions)).toEqual(sales('self.sales_earnings'));
  });

  it('keeps the payments and their files behind the own payments key', () => {
    expect(accessOf(mySalesRoutes.payments)).toEqual(sales('self.sales_payments'));
    expect(accessOf(mySalesRoutes.paymentAttachments)).toEqual(sales('self.sales_payments'));
  });
});
