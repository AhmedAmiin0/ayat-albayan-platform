import { fireEvent, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { bubbleId } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import { quoteOf } from '@/features/messaging/inbox/messages/lib/quote';
import { OWN, showChat } from '@/features/messaging/inbox/testing/correction-harness';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';

const scrollIntoView = vi.fn();
const saved = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
});
afterAll(() => {
  if (saved) Object.defineProperty(Element.prototype, 'scrollIntoView', saved);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});
afterEach(() => scrollIntoView.mockReset());

const c = t.inbox.correction;
const FIX = message({
  id: 'fix',
  direction: 'outbound',
  status: 'sent',
  body: 'تصحيح: الحلقة الساعة السادسة',
  reply_to: quoteOf(OWN),
  corrects_id: OWN.id,
  created_at: '2026-10-01T09:05:00Z',
});
const bubble = (id: string) => {
  const el = document.getElementById(bubbleId(id));
  if (!el) throw new Error(`no bubble ${id}`);
  return el;
};

describe('a corrected message (owner 2026-11-07)', () => {
  it('the original is greyed and marked «صُحِّحت»; the correction is not', () => {
    showChat([OWN, FIX]);
    const original = bubble(OWN.id);
    expect(within(original).getByText(c.mark)).toBeTruthy();
    const text = within(original).getByText(/The lesson is at five/);
    expect(text.closest('.opacity-60')).toBeTruthy();
    expect(within(bubble(FIX.id)).queryByText(c.mark)).toBeNull();
    expect(within(bubble(FIX.id)).getByText(/السادسة/).closest('.opacity-60')).toBeNull();
  });

  it('a click on the mark jumps to the correction', () => {
    showChat([OWN, FIX]);
    fireEvent.click(screen.getByRole('button', { name: c.jump }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(bubble(FIX.id));
    expect(document.activeElement).toBe(bubble(FIX.id));
  });

  it('no correction loaded: no mark', () => {
    showChat([OWN]);
    expect(screen.queryByText(c.mark)).toBeNull();
  });
});
