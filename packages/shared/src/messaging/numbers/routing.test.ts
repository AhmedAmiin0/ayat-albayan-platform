import { describe, expect, it } from 'vitest';
import { roleOrder, routeSession, routeTemplate, templateCandidates, type RoutableNumber } from './routing.js';

// docs/23c decisions 3–5: rule → template → role default → role fallbacks; sessions never fall back.
const num = (id: string, over: Partial<RoutableNumber> = {}): RoutableNumber => ({
  id,
  purpose: 'notifications',
  enabled: true,
  is_default: false,
  fallback_rank: 100,
  created_at: '2026-10-20T00:00:00Z',
  sendable: true,
  ...over,
});
const DEF = num('def', { is_default: true });
const SPARE_A = num('a', { fallback_rank: 5 });
const SPARE_B = num('b', { fallback_rank: 5, created_at: '2026-10-21T00:00:00Z' });
const CHAT = num('chat', { purpose: 'chat', is_default: true });
const ALL = [SPARE_B, CHAT, SPARE_A, DEF];
const base = { numbers: ALL, ruleNumberId: null, templateNumberId: null, line: 'notifications' as const, approvedOn: () => true };

describe('roleOrder / templateCandidates', () => {
  it('default first, then fallback_rank, then age; other roles left out', () => {
    expect(roleOrder(ALL, 'notifications').map((n) => n.id)).toEqual(['def', 'a', 'b']);
  });

  it('rule, then template, then the role; each id once', () => {
    expect(templateCandidates({ ...base, ruleNumberId: 'chat', templateNumberId: 'a' })).toEqual(['chat', 'a', 'def', 'b']);
  });
});

describe('routeTemplate', () => {
  it('the rule number wins when it can send and has the template', () => {
    expect(routeTemplate({ ...base, ruleNumberId: 'chat', templateNumberId: 'a' })).toBe('chat');
  });

  it('skips a disabled, a tokenless and an unapproved number, in that order', () => {
    const numbers = [num('r', { enabled: false }), num('t', { sendable: false }), DEF, SPARE_A];
    const approvedOn = (id: string) => id !== 'def';
    expect(routeTemplate({ ...base, numbers, ruleNumberId: 'r', templateNumberId: 't', approvedOn })).toBe('a');
  });

  it('an unknown (deleted) rule number is skipped', () => {
    expect(routeTemplate({ ...base, ruleNumberId: 'gone' })).toBe('def');
  });

  it('nothing can send → null (the row waits, fail closed)', () => {
    expect(routeTemplate({ ...base, approvedOn: () => false })).toBeNull();
    expect(routeTemplate({ ...base, numbers: [] })).toBeNull();
  });
});

describe('routeSession', () => {
  it('the stamped number, never another', () => {
    expect(routeSession(ALL, { numberId: 'a', line: 'notifications' })).toBe('a');
    expect(routeSession([num('a', { sendable: false }), DEF], { numberId: 'a', line: 'notifications' })).toBeNull();
    expect(routeSession([num('a', { enabled: false }), DEF], { numberId: 'a', line: 'notifications' })).toBeNull();
  });

  it('unstamped: the default of its line, else null', () => {
    expect(routeSession(ALL, { numberId: null, line: 'chat' })).toBe('chat');
    expect(routeSession([SPARE_A], { numberId: null, line: 'notifications' })).toBeNull();
  });
});
