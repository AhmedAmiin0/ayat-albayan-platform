import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from '@/modules/messaging/whatsapp/templates/sync/template-sync';
import { copyFits } from './crm-sent-fit';
import { CRM_REMINDER_BODY, FOOTER, REMINDER_MEET, reminderRow, sentViews } from './crm-sent.fakes';

// A crm_name change since the send: the copy may ask for values the row never carried.

const sent = (body: string[], buttons: number[] = []) => ({
  name: 'x', language: 'ar', body, header: null,
  buttons: buttons.map((index) => ({ index, kind: 'url' as const, value: `v${index}` })),
});
const LINK = { type: 'URL', text: 'افتح', url: 'https://x.example/{{1}}' };
const FIXED = { type: 'URL', text: 'الموقع', url: 'https://x.example/' };

describe('copyFits', () => {
  it('every {{n}} of the header and body and every {{1}} link has a sent value', () => {
    const copy = [
      { type: 'HEADER', format: 'TEXT', text: 'تذكير' },
      { type: 'BODY', text: '{{1}} و {{2}}' },
      { type: 'BUTTONS', buttons: [FIXED, LINK] },
    ];
    expect(copyFits(copy, sent(['a', 'b'], [1]))).toBe(true);
  });

  it('a {{n}} in the body or header beyond the sent body values: no fit', () => {
    expect(copyFits([{ type: 'BODY', text: '{{1}} {{3}}' }], sent(['a', 'b']))).toBe(false);
    const header = { type: 'HEADER', format: 'TEXT', text: 'حلقة {{2}}' };
    expect(copyFits([header, { type: 'BODY', text: '{{1}}' }], sent(['a']))).toBe(false);
  });

  it('a {{1}} link with no sent value at its index: no fit', () => {
    const copy = [{ type: 'BODY', text: 'نص' }, { type: 'BUTTONS', buttons: [FIXED, LINK] }];
    expect(copyFits(copy, sent([], [0]))).toBe(false);
  });
});

describe('CrmSentText falls back to the registry rendering', () => {
  beforeEach(() => vi.stubEnv('WA_PROVIDER', 'crm'));
  afterEach(() => vi.unstubAllEnvs());
  const registry = 'حلقتك مع طالب الساعة 5:00 م';
  const copyOf = (extra: Component) => ({
    'teacher_lesson_reminder:ar': [{ type: 'BODY', text: CRM_REMINDER_BODY }, extra],
  });

  it('happy path: the copy fits, the CRM text is shown', async () => {
    const { views } = sentViews([REMINDER_MEET], copyOf({ type: 'FOOTER', text: FOOTER }));
    expect((await views.view(reminderRow())).body).not.toBe(registry);
  });

  it('a copy asking for a third body value', async () => {
    const extra = { type: 'HEADER', format: 'TEXT', text: 'الحلقة {{3}}' };
    const { views } = sentViews([REMINDER_MEET], copyOf(extra));
    expect((await views.view(reminderRow())).body).toBe(registry);
  });

  it('a copy link button with no sent value', async () => {
    const { views } = sentViews([REMINDER_MEET], copyOf({ type: 'BUTTONS', buttons: [LINK] }));
    const v = await views.view(reminderRow());
    expect(v.body).toBe(registry);
    expect(v.template?.buttons).toEqual([
      { type: 'url', text: 'ادخل الحلقة', url: 'https://meet.jit.si/ab-x1' },
    ]);
  });
});
