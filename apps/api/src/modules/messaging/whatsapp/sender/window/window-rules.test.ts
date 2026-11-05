import { describe, expect, it } from 'vitest';
import { toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { answered, heldStep, holdable, reopenUsable, type WaitingRow } from './window-rules';

// The 24 h window's pure rules (owner 2026-11-03). Fakes only.

const STAFF = 's0000000-0000-4000-8000-000000000001';
const text = {
  template_key: null,
  created_by: STAFF,
  sent_by_teacher_id: null,
  interactive_payload: null,
};
const starter = {
  key: 'welcome_greeting',
  line: 'chat' as const,
  sales_starter: true,
  params: [],
  buttons: [],
  header_format: null,
};
const view = (over: Parameters<typeof templateRow>[0] = {}) =>
  toTemplateView(templateRow({ ...starter, ...over }));

describe("holdable: only a staff member's own chat message", () => {
  it('a staff text, file or forward on the chat line is held', () => {
    expect(holdable(text, 'chat')).toBe(true);
    expect(holdable({ ...text, interactive_payload: { type: 'gif' } }, 'chat')).toBe(true);
  });

  it.each([
    ["a teacher's text (docs/19: unchanged)", { ...text, sent_by_teacher_id: 't1' }, 'chat'],
    ["a job's row", { ...text, created_by: null }, 'chat'],
    ['a template', { ...text, template_key: 'welcome_greeting' }, 'chat'],
    [
      'a reaction',
      { ...text, interactive_payload: { type: 'reaction', message_id: 'w1', emoji: '👍' } },
      'chat',
    ],
    ['the notifications line', text, 'notifications'],
  ] as const)('%s is not', (_name, row, line) => {
    expect(holdable(row, line)).toBe(false);
  });
});

describe('reopenUsable: the chat_reopen_template setting rule', () => {
  it('an approved chat-line starter with no variables', () => {
    expect(reopenUsable(view())).toBe(true);
  });

  it.each([
    ['unset / unknown / not approved (registry: null)', null],
    ['not a starter', view({ sales_starter: false })],
    ['pending', view({ status: 'pending' })],
    ['another line', view({ line: 'notifications' })],
    ['a variable', view({ params: ['contact_name'] })],
    [
      'a URL button with a value',
      view({ buttons: [{ type: 'url', url: 'https://x.test/{{1}}' }] }),
    ],
    ['a PDF header', view({ header_format: 'document' })],
  ])('%s: refused', (_name, t) => {
    expect(reopenUsable(t)).toBe(false);
  });
});

describe('heldStep', () => {
  it('fresh from the inbox: hold; at its deadline: expire; any other row: none', () => {
    expect(heldStep({ error_code: 'awaiting_reply', expires_at: null })).toBe('hold');
    expect(heldStep({ error_code: 'awaiting_reply', expires_at: '2026-11-10T08:00:00Z' })).toBe(
      'expire',
    );
    expect(heldStep({ error_code: null, expires_at: null })).toBeNull();
    expect(heldStep({ error_code: 'sending', expires_at: null })).toBeNull();
  });
});

describe("answered: a reply releases only its own phone's rows, held before it", () => {
  const row = (id: string, phone: string, since: string | null): WaitingRow => ({
    id,
    phone_e164: phone,
    created_at: '2026-11-01T08:00:00Z',
    scheduled_for: since,
    error_text: null,
  });
  const rows = [
    row('a1', '+966500000001', '2026-11-01T09:00:00Z'),
    row('a2', '+966500000001', '2026-11-01T09:05:00Z'),
    row('b1', '+966500000002', '2026-11-01T09:00:00Z'),
    row('c1', '+966500000003', null),
  ];

  it('the family wrote after the hold: every row of that phone, in order; other phones stay', () => {
    const last = new Map([['+966500000001', '2026-11-02T10:00:00Z']]);
    expect(answered(rows, last)).toEqual(['a1', 'a2']);
  });

  it('an inbound from before the hold releases nothing (the window it saw was already closed)', () => {
    const last = new Map([['+966500000002', '2026-11-01T08:59:00Z']]);
    expect(answered(rows, last)).toEqual([]);
  });

  it('a row not held yet counts from when it was written', () => {
    expect(answered(rows, new Map([['+966500000003', '2026-11-01T08:30:00Z']]))).toEqual(['c1']);
  });
});
