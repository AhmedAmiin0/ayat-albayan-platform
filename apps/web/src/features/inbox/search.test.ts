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
});
