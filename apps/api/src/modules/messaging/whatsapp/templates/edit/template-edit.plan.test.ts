import type { TemplateEditInput } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { isRefusal, planEdit, type EditPlan } from './template-edit.plan';

// One edit's plan (owner 2026-11-14): Meta's rules, the code-bound rule and the body rules. Pure.

const now = new Date('2026-11-14T12:00:00Z');
const jitsi = { type: 'url' as const, text: 'ادخل', url: 'https://meet.jit.si/{{1}}' };
/** booking_confirmation: code-bound, two variables, one link button. */
const bound = templateRow({ status: 'approved', meta_id: '77' });
const words = (over: Partial<TemplateEditInput> = {}): TemplateEditInput => ({
  body: 'حُجزت حلقة {{1}} في {{2}} بإذن الله',
  footer: null,
  params: [{ name: 'a', sample: 'سارة' }, { name: 'b', sample: 'الأحد' }],
  buttons: [jitsi],
  ...over,
});
const plan = (row: TemplateRow, input: TemplateEditInput): EditPlan => {
  const out = planEdit(row, input, now);
  if (isRefusal(out)) throw new Error(out.refused);
  return out;
};
const refusal = (row: TemplateRow, input: TemplateEditInput) => {
  const out = planEdit(row, input, now);
  return isRefusal(out) ? out.refused : null;
};

describe('planEdit', () => {
  it('a code-bound template takes new words: back to review, the edit counted', () => {
    const p = plan(bound, words());
    expect(p.route).toBe('meta');
    expect(p.patch).toMatchObject({ status: 'pending', last_error: null, approved_edits: [now.toISOString()] });
    // Its variable names and its registry button stay the code's.
    expect(p.after.params).toEqual(['student_names', 'lesson_when']);
    expect(p.after.buttons).toEqual([{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل' }]);
  });

  it('a code-bound template keeps its variables and buttons', () => {
    expect(refusal(bound, words({ params: [{ name: 'a', sample: 'x' }], body: 'حلقة {{1}} اليوم' })))
      .toBe('code_bound_variables');
    expect(refusal(bound, words({ buttons: [] }))).toBe('code_bound_buttons');
    expect(refusal(bound, words({ buttons: [{ ...jitsi, url: 'https://evil.example/{{1}}' }] })))
      .toBe('code_bound_buttons');
    expect(refusal(bound, words({ buttons: [jitsi, { type: 'quick_reply', text: 'نعم' }] })))
      .toBe('code_bound_buttons');
  });

  it("Meta's limits: one approved edit a day, ten in 30 days; none while pending", () => {
    const edits = ['2026-11-14T01:00:00Z'];
    const day = templateRow({ status: 'approved', meta_id: '77', approved_edits: edits });
    expect(refusal(day, words())).toBe('edit_daily_limit');
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
    const ten = Array.from({ length: 10 }, (_, i) => daysAgo(i + 2));
    expect(refusal(templateRow({ status: 'approved', meta_id: '77', approved_edits: ten }), words()))
      .toBe('edit_monthly_limit');
    expect(refusal(templateRow({ status: 'pending', meta_id: '77' }), words())).toBe('not_editable');
    expect(refusal(templateRow({ status: 'disabled', meta_id: '77' }), words())).toBe('not_editable');
  });

  it('a rejected one is edited on Meta without counting; a never-sent one only here', () => {
    const rejected = plan(templateRow({ status: 'rejected', meta_id: '77' }), words());
    expect([rejected.route, rejected.patch.approved_edits]).toEqual(['meta', []]);
    const draft = plan(templateRow({ key: 'draft_x', status: 'not_submitted' }), words({ buttons: [] }));
    expect(draft.route).toBe('local');
    expect(draft.patch).not.toHaveProperty('status');
  });

  it("Meta's body rules and the link a sender completes", () => {
    const free = templateRow({ key: 'summer_offer', status: 'approved', meta_id: '9', buttons: [] });
    expect(refusal(free, words({ body: '{{1}} مرحبًا {{2}}' }))).toBe('invalid_template');
    const plainWithLink = words({ buttons: [jitsi, { type: 'quick_reply', text: 'نعم' }] });
    expect(refusal(free, plainWithLink)).toBe('reply_intent_required');
    const replies = plan(free, words({ buttons: [{ type: 'quick_reply', text: 'نعم' }] }));
    expect(replies.after.buttons).toEqual([]);
    expect(replies.after.display).toEqual({ header: null, buttons: [{ type: 'quick_reply', text: 'نعم' }] });
  });

  it('a call or copy-code button cannot be written back', () => {
    const display = { header: null, buttons: [{ type: 'phone_number', text: 'اتصل', phone: '+15550000000' }] };
    expect(refusal(templateRow({ key: 'call_us', meta_id: '9', buttons: [], display }), words({ buttons: [] })))
      .toBe('buttons_unsupported');
  });
});
