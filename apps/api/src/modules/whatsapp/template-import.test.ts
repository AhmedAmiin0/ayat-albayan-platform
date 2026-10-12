import { describe, expect, it } from 'vitest';
import { listFor, newStarters, starterRow } from './template-import';
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
  it('an approved text template → a chat row, a sales starter, var_1…var_n, Meta’s text and id', () => {
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
      sales_starter: true,
    });
  });

  it('four variables (like teacher_lesson_v2) → var_1…var_4; a teacher_ template is never a starter', () => {
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
    ['AUTHENTICATION', meta({ category: 'AUTHENTICATION' }), 'category AUTHENTICATION'],
    ['an image header', meta({ components: [{ type: 'HEADER', format: 'IMAGE' }, body('نص')] }), 'media or variable header'],
    ['a header variable', meta({ components: [{ type: 'HEADER', format: 'TEXT', text: 'أهلًا {{1}}' }, body('نص')] }), 'media or variable header'],
    ['named variables', meta({ components: [body('أهلًا {{first_name}}')] }), 'named variables'],
    ['ten variables', meta({ components: [body('{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}} {{9}} {{10}}')] }), 'more than 9 variables'],
    ['no body', meta({ components: [] }), 'no body'],
    ['a name that is no key', meta({ name: 'Academy-Welcome' }), 'the name is not a registry key'],
    ['a copy-code button', meta({ components: [body('نص'), { type: 'BUTTONS', buttons: [{ type: 'COPY_CODE', text: 'انسخ' }] }] }), 'a button that needs a value the platform cannot send'],
  ])('skips %s', (_name, m, reason) => {
    expect(starterRow(m, NOW)).toBe(reason);
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
      { name: 'lesson_reminder (ar)', reason: 'the key lesson_reminder is taken' },
      { name: 'academy_welcome (en)', reason: 'the key academy_welcome is taken' },
    ]);
  });
});

describe('listFor — the list a row is checked against', () => {
  const lists = (chat: MetaTemplate[] | null, chatOn: boolean) => ({ notifications: [meta({ name: 'n' })], chat, chatOn });

  it('notifications rows: notifications; chat rows: chat when configured, nothing when its read failed', () => {
    expect(listFor({ line: 'notifications' }, lists([], true))?.[0]?.name).toBe('n');
    expect(listFor({ line: 'chat' }, lists([meta()], true))?.[0]?.name).toBe('academy_welcome');
    expect(listFor({ line: 'chat' }, lists(null, true))).toBeNull();
  });

  it('one line: a chat row is checked against notifications (the WABA it would leave from)', () => {
    expect(listFor({ line: 'chat' }, lists(null, false))?.[0]?.name).toBe('n');
  });
});
