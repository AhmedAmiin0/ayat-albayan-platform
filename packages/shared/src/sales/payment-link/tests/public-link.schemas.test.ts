import { describe, expect, it } from 'vitest';
import { publicPaymentLinkSchema } from '../view.schemas';

const page = {
  status: 'open',
  first_name: 'Sara',
  amount: 120,
  currency: 'SAR',
  package: '4',
  lessons: 4,
  sandbox: true,
};

describe('publicPaymentLinkSchema (docs/30): what GET /pay/:token answers a payer', () => {
  it('reads a link page, with a custom lesson count as a null package', () => {
    expect(publicPaymentLinkSchema.parse(page)).toEqual(page);
    expect(publicPaymentLinkSchema.parse({ ...page, package: null }).package).toBeNull();
  });

  it('adds processing to the link statuses for an async payment still pending', () => {
    expect(publicPaymentLinkSchema.parse({ ...page, status: 'processing' }).status).toBe('processing');
    expect(publicPaymentLinkSchema.safeParse({ ...page, status: 'refunded' }).success).toBe(false);
  });

  it('drops any key beyond the first name, the amount and the package', () => {
    const parsed = publicPaymentLinkSchema.parse({ ...page, token: 'tok', student_id: 'x' });
    expect(Object.keys(parsed).toSorted()).toEqual(Object.keys(page).toSorted());
  });

  it('requires the sandbox flag and a numeric amount', () => {
    const { sandbox: _sandbox, ...noFlag } = page;
    expect(publicPaymentLinkSchema.safeParse(noFlag).success).toBe(false);
    expect(publicPaymentLinkSchema.safeParse({ ...page, amount: '120' }).success).toBe(false);
  });
});
