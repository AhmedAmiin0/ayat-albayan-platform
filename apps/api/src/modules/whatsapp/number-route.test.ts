import { describe, expect, it } from 'vitest';
import { approvedOn, routable, routeOf, ruleNumbers } from './number-route';
import { C1, N1, N2, overlayNum, routePass, THREE } from './number-route.fakes';
import { dueMessage } from './sender.fakes';
import { templateRow } from './whatsapp.fakes';

// docs/23c decisions 3–5: rule number → template number → role default → role fallbacks; sessions never fall back.

const N3 = '00000000-0000-4000-8000-0000000000a3';
const row = dueMessage();
const template = templateRow();
const text = (over: Parameters<typeof dueMessage>[0] = {}) => dueMessage({ template_key: null, body: 'نص', ...over });
const approvedEverywhere = { booking_confirmation: { [N1]: 'approved', [N2]: 'approved', [N3]: 'approved' } };

describe('routeOf: template rows', () => {
  it('no choice: the role\'s default number, approved by message_templates.status (decision 4)', () => {
    expect(routeOf(routePass(), { row, template })).toEqual({ numberId: N1, line: 'notifications' });
  });

  it('the catalogue row\'s number comes first, then the template\'s own number', () => {
    const pass = routePass({ rules: { booking_confirmation: N2 }, approvals: approvedEverywhere });
    expect(routeOf(pass, { row, template })?.numberId).toBe(N2);
    const own = routePass({ approvals: approvedEverywhere });
    expect(routeOf(own, { row, template: templateRow({ number_id: N2 }) })?.numberId).toBe(N2);
  });

  it('a chosen number that is disabled, has no token or lacks the approval falls back to the default', () => {
    const disabled = [overlayNum(), overlayNum({ id: N2, is_default: false, enabled: false })];
    expect(routeOf(routePass({ numbers: disabled, rules: { booking_confirmation: N2 }, approvals: approvedEverywhere }), { row, template })?.numberId).toBe(N1);
    const noToken = [overlayNum(), overlayNum({ id: N2, is_default: false, env: null })];
    expect(routeOf(routePass({ numbers: noToken, rules: { booking_confirmation: N2 }, approvals: approvedEverywhere }), { row, template })?.numberId).toBe(N1);
    const notThere = routePass({ rules: { booking_confirmation: N2 }, approvals: { booking_confirmation: { [N2]: 'pending' } } });
    expect(routeOf(notThere, { row, template })?.numberId).toBe(N1);
  });

  it('the default off → the role\'s other numbers by fallback_rank, never the other role', () => {
    const numbers = [overlayNum({ env: null }), overlayNum({ id: N3, is_default: false, fallback_rank: 1 }), ...THREE.slice(1)];
    expect(routeOf(routePass({ numbers, approvals: approvedEverywhere }), { row, template })?.numberId).toBe(N3);
    // a spare without its own synced approval never counts as approved
    expect(routeOf(routePass({ numbers }), { row, template })).toBeNull();
  });

  it('a template row with no registry row, or no number left, stays queued (null)', () => {
    expect(routeOf(routePass(), { row, template: null })).toBeNull();
    expect(routeOf(routePass(), { row, template: templateRow({ status: 'pending' }) })).toBeNull();
  });

  it('a chat template routes on the chat role and stamps line = chat', () => {
    const starter = templateRow({ key: 'academy_welcome', line: 'chat' });
    expect(routeOf(routePass(), { row: dueMessage({ template_key: 'academy_welcome' }), template: starter })).toEqual({ numberId: C1, line: 'chat' });
  });
});

describe('routeOf: session rows (decision 5)', () => {
  it('the number stamped at enqueue, else its line\'s default', () => {
    expect(routeOf(routePass(), { row: text({ number_id: N2 }), template: null })).toEqual({ numberId: N2, line: 'notifications' });
    expect(routeOf(routePass(), { row: text({ line: 'chat' }), template: null })).toEqual({ numberId: C1, line: 'chat' });
    expect(routeOf(routePass(), { row: text(), template: null })?.numberId).toBe(N1);
  });

  it('never falls back: its number off or tokenless → null', () => {
    const numbers = [overlayNum(), overlayNum({ id: N2, is_default: false, env: null })];
    expect(routeOf(routePass({ numbers }), { row: text({ number_id: N2 }), template: null })).toBeNull();
    expect(routeOf(routePass({ numbers: [overlayNum({ enabled: false })] }), { row: text(), template: null })).toBeNull();
  });
});

describe('ruleNumbers / approvedOn / routable', () => {
  it('each template key takes the number of the FIRST non-manual catalogue row listing it', () => {
    const map = ruleNumbers((key) => (key === 'booking_confirmation' ? N2 : null));
    expect(map.get('booking_confirmation_meet')).toBe(N2);
    expect(map.get('lesson_join_link')).toBeNull();
    expect(map.has('lesson_feedback_request')).toBe(false); // manual rows only
  });

  it('a synced row decides; without one only the role default counts, and only when approved', () => {
    const pass = routePass({ approvals: { booking_confirmation: { [N1]: 'rejected' } } });
    expect(approvedOn(pass, template)(N1)).toBe(false);
    expect(approvedOn(routePass(), template)(N1)).toBe(true);
    expect(approvedOn(routePass(), template)(N2)).toBe(false);
  });

  it('sendable = enabled with its own config', () => {
    expect(routable(overlayNum()).sendable).toBe(true);
    expect(routable(overlayNum({ env: null })).sendable).toBe(false);
    expect(routable(overlayNum({ enabled: false })).sendable).toBe(false);
  });
});
