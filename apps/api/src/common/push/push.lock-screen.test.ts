import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import { lockScreenText, PREVIEW_MAX, redact } from './push.lock-screen';
import type { PushTransport } from './push.service';

// Synthetic values only (the repo is public).
const PHONE = '+201000000123';

describe('redact (lock screen, owner 2026-10-25)', () => {
  it('masks phone numbers to their last 4 digits, in any spacing', () => {
    expect(redact(`اتصل على ${PHONE}`)).toBe('اتصل على •••0123');
    expect(redact('رقمي 010 0000 0123')).toBe('رقمي •••0123');
  });

  it('masks a phone typed in Arabic-Indic or Persian digits', () => {
    expect(redact('رقمي ٠١٠٠٠٠٠٠١٢٣')).toBe('رقمي •••٠١٢٣');
    expect(redact('رقمي ۰۱۰ ۰۰۰۰ ۰۱۲۳')).toBe('رقمي •••۰۱۲۳');
  });

  it('masks sums with a currency and email addresses; short numbers stay', () => {
    expect(redact('دفعت 500 جنيه و $20 و 1,200 EGP')).toBe('دفعت ••• و ••• و •••');
    expect(redact('راسلني على someone@example.com')).toBe('راسلني على •••');
    expect(redact('3 حلقات متبقية')).toBe('3 حلقات متبقية');
  });
});

describe('lockScreenText', () => {
  it('a new lead known only by number: masked number, clipped preview', () => {
    const text = 'ا'.repeat(100);
    const shown = lockScreenText({ kind: 'new_lead', vars: { name: PHONE, text } });
    expect(shown.title).toBe('رسالة من رقم جديد');
    expect(shown.body).not.toContain(PHONE);
    expect(shown.body.startsWith('•••0123: ')).toBe(true);
    expect(shown.body).toHaveLength('•••0123: '.length + PREVIEW_MAX);
  });

  it('one person’s name: first word only; a list of names and the lesson time stay', () => {
    const one = lockScreenText({ kind: 'report_submitted', vars: { student: 'سهيلة أحمد علي', teacher: 'مريم حسن' } });
    expect(one.body).toBe('كُتب تقرير حلقة سهيلة مع مريم');
    const many = lockScreenText({ kind: 'lesson_needs_confirmation', vars: { names: 'سهيلة أحمد وعلي حسن', when: '2026-10-25 17:00' } });
    expect(many.body).toBe('حلقة سهيلة أحمد وعلي حسن 2026-10-25 17:00 لم تتأكد بعد');
  });

  it('a compound first name stays whole; a list keeps each first name only', () => {
    const one = lockScreenText({ kind: 'report_submitted', vars: { student: 'عبد الرحمن محمد', teacher: 'أم كلثوم علي' } });
    expect(one.body).toBe('كُتب تقرير حلقة عبد الرحمن مع أم كلثوم');
    const list = lockScreenText({ kind: 'report_submitted', vars: { student: 'سهيلة أحمد وعلي حسن', teacher: 'مريم' } });
    expect(list.body).toBe('كُتب تقرير حلقة سهيلة وعلي مع مريم');
  });

  it('an overriding title is masked too', () => {
    expect(lockScreenText({ kind: 'new_message', vars: { name: PHONE, text: 'x' }, title: `طلب من ${PHONE}` }).title).toBe('طلب من •••0123');
  });
});

describe('PushService: devices get the lock-screen text, the bell row the full one', () => {
  it('new_lead from an unnamed number', async () => {
    const { db, writes } = fakePushDb([{ id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[a]'] }]);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyProfiles({
      kind: 'new_lead',
      subject: 'lead-1',
      vars: { name: PHONE, text: 'السلام عليكم' },
      profileIds: ['a1'],
    });
    await flushPushes();
    expect(writes.find((w) => w.op === 'upsert')?.value).toMatchObject({ body: `${PHONE}: السلام عليكم` });
    expect(transport.mock.calls[0]?.[0][0]?.body).toBe('•••0123: السلام عليكم');
    expect(send).toHaveBeenCalledWith('a1', expect.objectContaining({ body: '•••0123: السلام عليكم' }));
  });
});
