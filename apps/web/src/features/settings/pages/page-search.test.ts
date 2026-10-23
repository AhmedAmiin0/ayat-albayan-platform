import { describe, expect, it } from 'vitest';
import { communicationsSearch, oauthReturnRedirect, parseCommunicationsSearch, parseOauthReturnSearch } from './page-search';

describe('«التواصل» ?tab=', () => {
  it('keeps a known tab; the default and unknown tabs leave no param', () => {
    expect(parseCommunicationsSearch({ tab: 'catalogue' })).toEqual({ tab: 'catalogue' });
    expect(parseCommunicationsSearch({ tab: 'numbers' })).toEqual({ tab: 'numbers' });
    expect(parseCommunicationsSearch({ tab: 'templates' })).toEqual({ tab: 'templates' });
    expect(parseCommunicationsSearch({ tab: 'sending' })).toEqual({});
    expect(parseCommunicationsSearch({ tab: 'nope' })).toEqual({});
    expect(parseCommunicationsSearch({ tab: 3 })).toEqual({});
    expect(parseCommunicationsSearch({})).toEqual({});
  });

  it('a tab becomes its search; «الإرسال» is the bare URL', () => {
    expect(communicationsSearch('sending')).toEqual({});
    expect(communicationsSearch('templates')).toEqual({ tab: 'templates' });
  });
});

describe('Google OAuth return on «التكاملات»', () => {
  it('keeps google and reason (strings only)', () => {
    expect(parseOauthReturnSearch({ google: 'error', reason: 'denied', tab: 'x' })).toEqual({ google: 'error', reason: 'denied' });
    expect(parseOauthReturnSearch({ google: '', reason: 4 })).toEqual({});
  });

  it('?google= goes to «مزامنة Google» with the same query, replacing the entry', () => {
    expect(oauthReturnRedirect({ google: 'connected' })).toEqual({
      to: '/admin/settings/google',
      search: { google: 'connected' },
      replace: true,
    });
    expect(oauthReturnRedirect({ google: 'error', reason: 'denied' })?.search).toEqual({ google: 'error', reason: 'denied' });
  });

  it('no ?google=: stays on «التكاملات»', () => {
    expect(oauthReturnRedirect({})).toBeNull();
  });
});
