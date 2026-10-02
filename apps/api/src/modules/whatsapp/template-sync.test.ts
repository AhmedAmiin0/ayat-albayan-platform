import { describe, expect, it } from 'vitest';
import { toMetaTemplate } from './meta-shapes';
import { findMeta, ourStatus, syncPatch } from './template-sync';
import { RECORDED, REMINDER_24H, templateRow } from './whatsapp.fakes';
import type { MetaTemplate } from './whatsapp.types';

const NOW = new Date('2026-10-02T08:00:00Z');
const recorded = RECORDED.templates.body.data.map((t) => toMetaTemplate({ ...t, components: [...t.components] }));

function meta(over: Partial<MetaTemplate>): MetaTemplate {
  return { id: 'meta-1', name: 'x', language: 'ar', status: 'APPROVED', category: 'UTILITY', quality: 'GREEN', components: [], rejectedReason: null, ...over };
}

describe('template health sync (docs/12 §3.4)', () => {
  it.each([
    ['APPROVED', 'approved'],
    ['PENDING', 'pending'],
    ['IN_APPEAL', 'pending'],
    ['REJECTED', 'rejected'],
    ['PAUSED', 'paused'],
    ['DISABLED', 'disabled'],
    ['LIMIT_EXCEEDED', 'disabled'],
    ['ARCHIVED', 'disabled'],
    ['PENDING_DELETION', 'disabled'],
    ['DELETED', 'disabled'],
    ['approved', 'approved'],
    ['SOMETHING_NEW', 'pending'],
  ])('Meta %s → %s', (m, ours) => {
    expect(ourStatus(m)).toBe(ours);
  });

  it('copies Meta’s body, footer, URL button text, id and quality over our shapes (recorded stub list)', () => {
    const row = templateRow({ body_ar: 'شكل قديم {{1}} {{2}}', footer_ar: null });
    const found = findMeta(row, recorded);
    expect(syncPatch(row, found, NOW)).toEqual({
      last_checked_at: '2026-10-02T08:00:00.000Z',
      status: 'approved',
      meta_id: 'a1d6d82d-ad18-4c74-b8ef-a35242561a7b',
      quality: 'GREEN',
      last_error: null,
      body_ar: 'تم حجز حلقة {{1}} — {{2}}',
      footer_ar: 'أكاديمية آيات البيان',
      buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل الحلقة' }],
    });
  });

  it('matches by Meta name and language, not by our key', () => {
    const row = templateRow({ key: 'lesson_reminder', meta_name: 'lesson_reminder_v2' });
    expect(findMeta(row, [meta({ name: 'lesson_reminder' }), meta({ name: 'lesson_reminder_v2', id: 'v2' })])?.id).toBe('v2');
    expect(findMeta(row, [meta({ name: 'lesson_reminder_v2', language: 'en' })])).toBeUndefined();
  });

  it('not on Meta: a never-submitted row stays not_submitted, anything else becomes missing', () => {
    expect(syncPatch(templateRow({ status: 'not_submitted' }), undefined, NOW)).toEqual({
      last_checked_at: '2026-10-02T08:00:00.000Z',
      status: 'not_submitted',
    });
    expect(syncPatch(templateRow({ status: 'approved' }), undefined, NOW).status).toBe('missing');
    expect(syncPatch(templateRow({ status: 'pending' }), undefined, NOW).status).toBe('missing');
  });

  it('a rejection keeps Meta’s reason in last_error', () => {
    const patch = syncPatch(templateRow(), meta({ status: 'REJECTED', rejectedReason: 'INVALID_FORMAT' }), NOW);
    expect(patch).toMatchObject({ status: 'rejected', last_error: 'INVALID_FORMAT' });
  });

  it('quick replies keep our intents by index, else read them from the button text', () => {
    const comps = [
      { type: 'BODY', text: REMINDER_24H.body_ar },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'تمام' }, { type: 'QUICK_REPLY', text: 'محتاجين نغيّر الميعاد' }] },
    ];
    expect(syncPatch(REMINDER_24H, meta({ components: comps }), NOW).buttons).toEqual([
      { type: 'quick_reply', text: 'تمام', intent: 'confirm' },
      { type: 'quick_reply', text: 'محتاجين نغيّر الميعاد', intent: 'reschedule' },
    ]);
    const fresh = templateRow({ buttons: [] });
    const stop = [{ type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'وقف الرسايل' }] }];
    expect(syncPatch(fresh, meta({ components: stop }), NOW).buttons).toEqual([{ type: 'quick_reply', text: 'وقف الرسايل', intent: 'stop' }]);
  });

  it('a button we cannot model keeps our buttons untouched (indexes stay right); no BODY keeps our body', () => {
    const phone = [{ type: 'BUTTONS', buttons: [{ type: 'PHONE_NUMBER', text: 'كلمنا' }, { type: 'URL', url: 'https://meet.jit.si/{{1}}' }] }];
    const patch = syncPatch(templateRow(), meta({ components: phone }), NOW);
    expect(patch).not.toHaveProperty('buttons');
    expect(patch).not.toHaveProperty('body_ar');
    expect(patch.footer_ar).toBeNull();
    const unclear = [{ type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'شوف' }] }, 'garbage'];
    expect(syncPatch(templateRow({ buttons: [] }), meta({ components: unclear }), NOW)).not.toHaveProperty('buttons');
  });
});
