import { describe, expect, it } from 'vitest';
import { newStarters, starterRow } from './template-import';
import { templateRow } from './whatsapp.fakes';
import type { MetaTemplate } from './whatsapp.types';

// The chat line's import (owner 2026-10-12, docs/12 §3.4): invented Meta templates, Meta's shapes.

const NOW = new Date('2026-10-12T08:00:00Z');
const body = (text: string) => ({ type: 'BODY', text });

function meta(over: Partial<MetaTemplate> = {}): MetaTemplate {
  return {
    id: 'meta-w1',
    name: 'academy_welcome',
    language: 'ar',
    status: 'APPROVED',
    category: 'MARKETING',
    quality: 'GREEN',
    components: [body('أهلًا {{1}}، يسعدنا تواصلك مع الأكاديمية. ما اسم الطالب وعمره؟'), { type: 'FOOTER', text: 'أكاديمية آيات البيان' }],
    rejectedReason: null,
    ...over,
  };
}

describe('starterRow — one chat-WABA template as a registry row', () => {
  it('an approved text template → a chat row, var_1…var_n, Meta’s text and id; flagged only as a default', () => {
    expect(starterRow(meta(), NOW)).toEqual({
      key: 'academy_welcome',
      meta_name: 'academy_welcome',
      language: 'ar',
      category: 'marketing',
      body_ar: 'أهلًا {{1}}، يسعدنا تواصلك مع الأكاديمية. ما اسم الطالب وعمره؟',
      footer_ar: 'أكاديمية آيات البيان',
      params: ['var_1'],
      buttons: [],
      status: 'approved',
      quality: 'GREEN',
      meta_id: 'meta-w1',
      last_checked_at: '2026-10-12T08:00:00.000Z',
      line: 'chat',
      sales_starter: false,
    });
  });

  it.each(['free_trial_invite', 'welcome_greeting'])('%s (a restricted default) is imported flagged', (name) => {
    expect(starterRow(meta({ name }), NOW)).toMatchObject({ key: name, sales_starter: true });
  });

  it('four variables (like teacher_lesson_v2) → var_1…var_4; not a default, so not flagged', () => {
    const row = starterRow(meta({ name: 'teacher_lesson_v2', components: [body('{{1}} و{{2}} في {{3}} مع {{4}}.')] }), NOW);
    expect(row).toMatchObject({ params: ['var_1', 'var_2', 'var_3', 'var_4'], sales_starter: false, footer_ar: null });
  });

  it('a plain text header passes; a fixed link and an unknown quick reply need no value', () => {
    const header = { type: 'HEADER', format: 'TEXT', text: 'مرحبًا' };
    const buttons = { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'أريد التسجيل' }, { type: 'PHONE_NUMBER', text: 'اتصل' }] };
    expect(starterRow(meta({ components: [header, body('نص'), buttons] }), NOW)).toMatchObject({ buttons: [] });
    const link = { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'الموقع', url: 'https://ayatalbayan.com' }] };
    expect(starterRow(meta({ components: [body('نص'), link] }), NOW)).toMatchObject({
      buttons: [{ type: 'url', url: 'https://ayatalbayan.com', text: 'الموقع' }],
    });
  });

  it.each([
    ['AUTHENTICATION', meta({ category: 'AUTHENTICATION' }), { code: 'category', category: 'AUTHENTICATION' }],
    ['an image header', meta({ components: [{ type: 'HEADER', format: 'IMAGE' }, body('نص')] }), { code: 'media_header' }],
    ['a header variable', meta({ components: [{ type: 'HEADER', format: 'TEXT', text: 'أهلًا {{1}}' }, body('نص')] }), { code: 'media_header' }],
    ['named variables', meta({ components: [body('أهلًا {{first_name}}')] }), { code: 'named_vars' }],
    ['ten variables', meta({ components: [body('{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}} {{9}} {{10}}')] }), { code: 'too_many_vars', max: 9 }],
    ['no body', meta({ components: [] }), { code: 'no_body' }],
    ['a name that is no key', meta({ name: 'Academy-Welcome' }), { code: 'bad_key' }],
    ['a copy-code button', meta({ components: [body('نص'), { type: 'BUTTONS', buttons: [{ type: 'COPY_CODE', text: 'انسخ' }] }] }), { code: 'button_value' }],
  ])('skips %s', (_name, m, reason) => {
    expect(starterRow(m, NOW)).toEqual(reason);
  });
});

describe('newStarters — the templates the registry does not know yet', () => {
  it('imports each unknown approved one once; known Meta names are the sync’s; a taken key is reported', () => {
    const known = [templateRow(), templateRow({ key: 'lesson_reminder', meta_name: 'lesson_reminder_v2' })];
    const plan = newStarters({
      meta: [
        meta(),
        meta({ name: 'booking_confirmation' }), // on both WABAs: the notifications row is synced, nothing imported
        meta({ name: 'lesson_reminder' }), // the key is taken (our lesson_reminder is Meta's lesson_reminder_v2)
        meta({ name: 'promo_pending', status: 'PENDING' }),
        meta({ language: 'en' }), // same name, another language: key academy_welcome is taken by the first
      ],
      known,
      now: NOW,
    });
    expect(plan.rows.map((r) => r.key)).toEqual(['academy_welcome']);
    expect(plan.skipped).toEqual([
      { name: 'lesson_reminder (ar)', reason: { code: 'key_taken' } },
      { name: 'academy_welcome (en)', reason: { code: 'key_taken' } },
    ]);
  });
});

describe('the notifications WABA’s import (owner 2026-10-18)', () => {
  it('a row on line notifications, never flagged, even for a restricted default', () => {
    expect(starterRow(meta({ name: 'free_trial_invite' }), NOW, 'notifications')).toMatchObject({ line: 'notifications', sales_starter: false });
    expect(starterRow(meta({ name: 'trial_reschedule' }), NOW, 'chat')).toMatchObject({ line: 'chat', sales_starter: true });
  });

  it('newStarters imports on the given line and skips a name known on the other line', () => {
    const known = [templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat' })];
    const plan = newStarters({ meta: [meta(), meta({ name: 'promo_offer', id: 'p1' })], known, now: NOW, line: 'notifications' });
    expect(plan.rows.map((r) => [r.key, r.line, r.sales_starter])).toEqual([['promo_offer', 'notifications', false]]);
  });
});
