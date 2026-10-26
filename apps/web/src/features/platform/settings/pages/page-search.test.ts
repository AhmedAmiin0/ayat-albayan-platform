import { isEditableValueKey, VALUE_GROUPS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  communicationsAliasRedirect,
  communicationsSearch,
  oauthReturnRedirect,
  parseCommunicationsSearch,
  parseOauthReturnSearch,
  shownTab,
  timingRedirect,
  VALUES_GROUP,
} from './page-search';

describe('«التواصل» ?tab=', () => {
  it('keeps a known tab; the default, the old «الإرسال» and unknown tabs leave no param', () => {
    expect(parseCommunicationsSearch({ tab: 'catalogue' })).toEqual({ tab: 'catalogue' });
    expect(parseCommunicationsSearch({ tab: 'numbers' })).toEqual({ tab: 'numbers' });
    expect(parseCommunicationsSearch({ tab: 'templates' })).toEqual({ tab: 'templates' });
    expect(parseCommunicationsSearch({ tab: 'safety' })).toEqual({ tab: 'safety' });
    expect(parseCommunicationsSearch({ tab: 'overview' })).toEqual({});
    expect(parseCommunicationsSearch({ tab: 'sending' })).toEqual({});
    expect(parseCommunicationsSearch({ tab: 'nope' })).toEqual({});
    expect(parseCommunicationsSearch({ tab: 3 })).toEqual({});
    expect(parseCommunicationsSearch({})).toEqual({});
  });

  it('a tab becomes its search; «نظرة عامة» is the bare URL', () => {
    expect(communicationsSearch('overview')).toEqual({});
    expect(communicationsSearch('templates')).toEqual({ tab: 'templates' });
  });

  it('?audience= stays with «الإشعارات» only; an unknown audience is dropped', () => {
    expect(parseCommunicationsSearch({ tab: 'catalogue', audience: 'teacher' })).toEqual({ tab: 'catalogue', audience: 'teacher' });
    expect(parseCommunicationsSearch({ tab: 'catalogue', audience: 'nobody' })).toEqual({ tab: 'catalogue' });
    expect(parseCommunicationsSearch({ tab: 'catalogue', audience: 2 })).toEqual({ tab: 'catalogue' });
    expect(parseCommunicationsSearch({ tab: 'numbers', audience: 'teacher' })).toEqual({ tab: 'numbers' });
    expect(parseCommunicationsSearch({ audience: 'teacher' })).toEqual({});
    expect(communicationsSearch('catalogue', 'lead')).toEqual({ tab: 'catalogue', audience: 'lead' });
    expect(communicationsSearch('catalogue')).toEqual({ tab: 'catalogue' });
    expect(communicationsSearch('safety', 'lead')).toEqual({ tab: 'safety' });
    expect(communicationsSearch('overview', 'lead')).toEqual({});
  });

  it('the tab in view: the parsed one, else «نظرة عامة» (also for the moved `timing`)', () => {
    expect(shownTab({ tab: 'safety' })).toBe('safety');
    expect(shownTab({})).toBe('overview');
    expect(shownTab(parseCommunicationsSearch({ tab: 'sending' }))).toBe('overview');
    expect(shownTab({ tab: 'timing' })).toBe('overview');
  });

  it('?tab=timing goes to «القيم» › «الرسائل» (replace); other tabs stay', () => {
    expect(timingRedirect(parseCommunicationsSearch({ tab: 'timing' }))).toEqual({
      to: '/admin/settings/values',
      search: { group: 'messages' },
      replace: true,
    });
    expect(timingRedirect({ tab: 'numbers' })).toBeNull();
    expect(timingRedirect({})).toBeNull();
  });

  it('that group holds both timing values, editable there; the public number sits in «الأكاديمية»', () => {
    const timing = ['quick_reply_window_hours', 'reminder_lookahead_hours'] as const;
    // The WhatsApp calls switch (docs/28) sits in the same messaging group.
    expect([...VALUE_GROUPS[VALUES_GROUP.timing]].sort()).toEqual([...timing, 'whatsapp_calls_enabled']);
    expect(timing.every((k) => isEditableValueKey(k))).toBe(true);
    expect(VALUE_GROUPS[VALUES_GROUP.academy]).toContain('academy_whatsapp_e164');
  });

  it('/admin/communications opens «التواصل» with the whole query, replacing the entry', () => {
    expect(communicationsAliasRedirect({ tab: 'templates', x: '1' })).toEqual({
      to: '/admin/settings/communications',
      search: { tab: 'templates', x: '1' },
      replace: true,
    });
    expect(communicationsAliasRedirect({}).search).toEqual({});
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
