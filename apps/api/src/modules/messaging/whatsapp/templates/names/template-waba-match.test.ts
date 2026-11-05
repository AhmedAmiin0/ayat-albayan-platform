import { describe, expect, it } from 'vitest';
import { REPORT_READY, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';
import { newStarters } from '@/modules/messaging/whatsapp/templates/sync/template-import';
import { wabaMatch, wabaNames, wabaSyncPatch } from './template-waba-match';

// docs/19 «CRM → Meta»: a meta line's sync reads a key by the WABA name it goes as.

const NOW = new Date('2026-11-02T10:00:00Z');
const meta = (name: string, over: Partial<MetaTemplate> = {}): MetaTemplate => ({
  id: `id-${name}`,
  name,
  language: 'ar',
  status: 'APPROVED',
  category: 'UTILITY',
  quality: 'GREEN',
  components: [{ type: 'BODY', text: `${name} {{1}} {{2}} {{3}} {{4}} {{5}}` }],
  rejectedReason: null,
  ...over,
});
const ALERT = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', body_ar: 'طالب {{1}}', status: 'approved' });

describe('wabaSyncPatch', () => {
  it('teacher_new_student: approved by teacher_lesson_v2, its own meta_name absent, never missing', () => {
    const patch = wabaSyncPatch(ALERT, [meta('teacher_lesson_v2')], NOW);
    expect(patch).toEqual({ last_checked_at: NOW.toISOString(), status: 'approved', quality: 'GREEN', last_error: null });
  });

  it('a mapped name keeps the row\'s own body, buttons, display and meta_id', () => {
    const patch = wabaSyncPatch(ALERT, [meta('teacher_lesson_v2'), meta('teacher_new_student')], NOW);
    expect(patch).not.toHaveProperty('body_ar');
    expect(patch).not.toHaveProperty('meta_id');
    expect(patch).not.toHaveProperty('buttons');
  });

  it('the WABA template paused or rejected: that status (and the reason)', () => {
    expect(wabaSyncPatch(ALERT, [meta('teacher_lesson_v2', { status: 'PAUSED' })], NOW).status).toBe('paused');
    const rejected = meta('teacher_lesson_v2', { status: 'REJECTED', rejectedReason: 'INVALID_FORMAT' });
    expect(wabaSyncPatch(ALERT, [rejected], NOW)).toMatchObject({ status: 'rejected', last_error: 'INVALID_FORMAT' });
  });

  it('the WABA name absent: missing, never approved by meta_name (the sends go by the WABA name)', () => {
    const own = wabaSyncPatch(ALERT, [meta('teacher_new_student')], NOW);
    expect(own).toMatchObject({ status: 'missing' });
    expect(own).not.toHaveProperty('meta_id');
    expect(wabaSyncPatch(ALERT, [], NOW).status).toBe('missing');
  });

  it('an ordinary row absent: missing as before; a never-submitted one stays not_submitted', () => {
    expect(wabaSyncPatch(templateRow(), [], NOW).status).toBe('missing');
    expect(wabaSyncPatch(templateRow({ status: 'not_submitted' }), [], NOW).status).toBe('not_submitted');
  });

  it('an admin\'s WABA name and language (report_ready → report_session)', () => {
    const report = templateRow({ ...REPORT_READY, status: 'missing', crm_name: 'report_session' });
    expect(wabaSyncPatch(report, [meta('report_session')], NOW).status).toBe('approved');
    const lang = templateRow({ crm_language: 'ar_EG' });
    expect(wabaMatch(lang, [meta('booking_confirmation', { language: 'ar_EG' })]).mapped).toBe(true);
  });

  it('an ordinary row: its own template, not mapped', () => {
    expect(wabaMatch(templateRow(), [meta('booking_confirmation')])).toMatchObject({ mapped: false, meta: { name: 'booking_confirmation' } });
  });
});

describe('wabaNames and the import', () => {
  it('own, mapped and both report names', () => {
    expect(wabaNames(ALERT)).toEqual(['teacher_new_student:ar', 'teacher_lesson_v2:ar']);
    const report = templateRow({ ...REPORT_READY, crm_name: 'report_session' });
    expect(new Set(wabaNames(report))).toEqual(new Set(['report_ready:ar', 'report_session:ar', 'report_trial_session:ar']));
  });

  it('a WABA template a row goes as is never imported as a new row', () => {
    const report = templateRow({ ...REPORT_READY, crm_name: 'report_session' });
    const list = ['teacher_lesson_v2', 'report_session', 'report_trial_session'].map((n) => meta(n, { components: [{ type: 'BODY', text: 'x' }] }));
    const plan = newStarters({ meta: [...list, meta('welcome', { components: [{ type: 'BODY', text: 'w' }] })], known: [ALERT, report], now: NOW, line: 'notifications' });
    expect(plan.rows.map((r) => r.key)).toEqual(['welcome']);
  });
});
