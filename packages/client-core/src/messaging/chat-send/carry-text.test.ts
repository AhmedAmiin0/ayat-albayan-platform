import type { TemplateView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { carriesText, messageTemplate } from './carry-text.js';

const tpl = (over: Partial<TemplateView>): TemplateView =>
  ({ key: 'academy_message', line: 'chat', status: 'approved', ...over }) as TemplateView;
const ACADEMY = tpl({});

describe('messageTemplate: academy_message on the chat line, when on this user’s list', () => {
  it('found when listed for this user on the chat line', () => {
    expect(messageTemplate([tpl({ key: 'welcome_greeting' }), ACADEMY])).toBe(ACADEMY);
  });

  it('not listed (not allowed, not imported) or on another line: none', () => {
    expect(messageTemplate([tpl({ key: 'welcome_greeting' })])).toBeNull();
    expect(messageTemplate([tpl({ line: 'notifications' })])).toBeNull();
  });
});

describe('carriesText: «أرسِل الآن داخل قالب» (owner 2026-11-14)', () => {
  const base = { bar: 'reopen' as const, draft: 'نص', template: ACADEMY, unconfirmed: false };

  it('closed window, a draft, the template approved and allowed: shown', () => {
    expect(carriesText(base)).toBe(true);
  });

  it.each([
    ['no draft', { draft: '  \n' }],
    ['its last send got no answer (may be held)', { unconfirmed: true }],
    ['not allowed or not imported', { template: null }],
    ['not approved', { template: tpl({ status: 'pending' }) }],
    ['window open', { bar: 'open' as const }],
    ['a reopen template is live', { bar: 'sent' as const }],
    ['no template allowed', { bar: 'none_allowed' as const }],
  ])('%s: hidden', (_, over) => {
    expect(carriesText({ ...base, ...over })).toBe(false);
  });
});
