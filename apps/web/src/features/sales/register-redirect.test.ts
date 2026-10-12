import { describe, expect, it } from 'vitest';
import { registerRedirect } from './register-redirect';

describe('the old /sales/register link', () => {
  it('lands on the sales inbox when it carried no number', () => {
    expect(registerRedirect({})).toEqual({ to: '/sales/inbox', search: { page: 1 } });
    expect(registerRedirect({ leadId: 'x', phone: 'abc' })).toEqual({ to: '/sales/inbox', search: { page: 1 } });
  });

  it('opens that chat when it carried the lead’s number (normalised to E.164)', () => {
    expect(registerRedirect({ leadId: 'x', phone: '+966 50 123 4567', name: 'أم سهيلة' })).toEqual({
      to: '/sales/inbox',
      search: { page: 1, phone: '+966501234567' },
    });
  });
});
