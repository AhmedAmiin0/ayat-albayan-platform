import { describe, expect, it } from 'vitest';
import { parseInboxSearch } from './search';

describe('parseInboxSearch', () => {
  it('keeps a valid E.164 thread, trimmed search, the unread filter and the page', () => {
    expect(parseInboxSearch({ phone: '+966501234567', q: ' سهيلة ', unread: true, page: 3 })).toEqual({
      phone: '+966501234567',
      q: 'سهيلة',
      unread: true,
      page: 3,
    });
  });

  it('uses the shared E.164 rule (the DB domain): 8–15 digits after the +', () => {
    expect(parseInboxSearch({ phone: '+12345678' })).toEqual({ phone: '+12345678', page: 1 });
    expect(parseInboxSearch({ phone: '+1234567' })).toEqual({ page: 1 });
    expect(parseInboxSearch({ phone: '+1234567890123456' })).toEqual({ page: 1 });
  });

  it('accepts unread as the string the URL gives back', () => {
    expect(parseInboxSearch({ unread: 'true' })).toEqual({ unread: true, page: 1 });
  });

  it.each([['0501234567'], ['+0501234567'], ['+9665'], [966501234567], ['']])('drops a non-E.164 phone %s', (phone) => {
    expect(parseInboxSearch({ phone })).toEqual({ page: 1 });
  });

  it('blank search, false unread and a bad page fall back to defaults', () => {
    expect(parseInboxSearch({ q: '  ', unread: false, page: 'x' })).toEqual({ page: 1 });
    expect(parseInboxSearch({ page: 0 })).toEqual({ page: 1 });
    expect(parseInboxSearch({ page: 2.5 })).toEqual({ page: 1 });
  });

  it('keeps a known sort and lead status (R-NFR-08)', () => {
    expect(parseInboxSearch({ sort: 'unread', f_status: 'new' })).toEqual({ sort: 'unread', f_status: 'new', page: 1 });
  });

  it('drops an unknown sort or status', () => {
    expect(parseInboxSearch({ sort: 'phone_e164', f_status: 'nope' })).toEqual({ page: 1 });
  });

  it('keeps a chat list id «القوائم» and drops anything that is not an id (docs/22)', () => {
    const list = '0c000000-0000-4000-8000-000000000001';
    expect(parseInboxSearch({ list })).toEqual({ list, page: 1 });
    expect(parseInboxSearch({ list: 'بانتظار الدفع' })).toEqual({ page: 1 });
    expect(parseInboxSearch({ list: 42 })).toEqual({ page: 1 });
  });

  it('keeps «المكالمات» (docs/28) as calls=true', () => {
    expect(parseInboxSearch({ calls: 'true' }).calls).toBe(true);
    expect(parseInboxSearch({ calls: 'no' }).calls).toBeUndefined();
  });
});
