import { t } from '@/lib/i18n';
import { ltr } from '@/ui/Ltr';
import { chatName, forwardNotice, selectedLine } from './forward-text';

const names: Record<string, string> = { '+966500000001': 'أم يوسف', '+966500000002': 'أبو سالم' };
const nameOf = (phone: string) => names[phone] ?? phone;

describe('forwardNotice', () => {
  it('all sent: one line, nothing to keep on screen', () => {
    const n = forwardNotice([{ phone: '+966500000001', sent: true, message_id: 'c1' }], nameOf);
    expect(n).toEqual({ text: t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '0') });
  });

  it('each skipped chat is named with its reason, in request order', () => {
    const n = forwardNotice(
      [
        { phone: '+966500000002', sent: false, reason: 'not_your_thread' },
        { phone: '+966500000001', sent: true, message_id: 'c1' },
        { phone: '+966500000001', sent: false, reason: 'send_failed' },
      ],
      nameOf,
    );
    expect(n.text).toBe(t.inbox.forward.result.replace('{sent}', '1').replace('{skipped}', '2'));
    expect(n.details).toEqual([
      `أبو سالم: ${t.inbox.forward.skip.not_your_thread}`,
      `أم يوسف: ${t.inbox.forward.skip.send_failed}`,
    ]);
  });
});

describe('chatName / selectedLine', () => {
  it('a chat is its name, else its isolated number', () => {
    expect(chatName({ display_name: 'أم يوسف', phone_e164: '+966500000001' })).toBe('أم يوسف');
    expect(chatName({ display_name: null, phone_e164: '+966500000001' })).toBe(ltr('+966 50 000 0001'));
  });
  it('the counter', () => {
    expect(selectedLine(2, 5)).toBe(t.inbox.forward.selected.replace('{count}', '2').replace('{max}', '5'));
  });
});
