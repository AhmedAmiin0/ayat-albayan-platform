import type { MessageTemplateBlock, MessageView } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageBubble } from './MessageBubble';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const block = (over: Partial<MessageTemplateBlock> = {}): MessageTemplateBlock => ({ header: null, footer: null, buttons: [], ...over });

function bubble(patch: Partial<MessageView>) {
  renderWithClient(
    <ul>
      <MessageBubble
        message={message({ direction: 'outbound', status: 'sent', template_key: 'lesson_reminder_meet', body: 'حلقة سلمى اليوم', ...patch })}
        waitingTemplate={false}
        now={new Date('2026-10-01T12:00:00Z')}
      />
    </ul>,
  );
  return screen.getByRole('article');
}

describe('MessageBubble: a template like WhatsApp (owner 2026-10-28)', () => {
  it('the header in bold over the body, the footer in small grey text under it', () => {
    const b = bubble({ template: block({ header: { type: 'text', text: 'تذكير بالحلقة' }, footer: 'أكاديمية آيات البيان' }) });
    const header = within(b).getByText('تذكير بالحلقة');
    expect(header.className).toContain('font-bold');
    expect(header.getAttribute('dir')).toBe('auto');
    const footer = within(b).getByText('أكاديمية آيات البيان');
    expect(footer.className).toContain('text-ink-3');
    expect(header.compareDocumentPosition(within(b).getByText('حلقة سلمى اليوم')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('a URL button opens its link in a new tab, with the link icon', () => {
    const b = bubble({ template: block({ buttons: [{ type: 'url', text: 'ادخل الحلقة', url: 'https://meet.google.com/abc' }] }) });
    const list = within(b).getByRole('list', { name: 'أزرار القالب' });
    const link = within(list).getByRole('link', { name: 'ادخل الحلقة: يفتح الرابط' });
    expect(link.getAttribute('href')).toBe('https://meet.google.com/abc');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('quick reply, call and copy code are display-only rows, each with its label', () => {
    const b = bubble({
      template: block({
        buttons: [
          { type: 'quick_reply', text: 'تأكيد' },
          { type: 'phone_number', text: 'اتصل بنا', phone: '+966500000000' },
          { type: 'copy_code', text: '' },
        ],
      }),
    });
    const list = within(b).getByRole('list', { name: 'أزرار القالب' });
    expect(within(list).queryAllByRole('link')).toHaveLength(0);
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('تأكيد');
    expect(rows[1]?.textContent).toContain('+966500000000');
    // Meta gave no label: the kind's own, never a blank row.
    expect(rows[2]?.textContent).toContain('نسخ الرمز');
    for (const row of rows) expect(row.querySelector('svg')).not.toBeNull();
  });

  it('the buttons sit right under the time; a failed send’s notes come after them', () => {
    const b = bubble({ status: 'failed', error_code: '131049', template: block({ buttons: [{ type: 'quick_reply', text: 'تأكيد' }] }) });
    const list = within(b).getByRole('list', { name: 'أزرار القالب' });
    expect(list.previousElementSibling?.tagName).toBe('FOOTER');
    expect(list.nextElementSibling?.textContent).toBeTruthy();
  });

  it('a document header with no file shows its kind; a message without a block renders as before', () => {
    const b = bubble({ template: block({ header: { type: 'document' } }) });
    expect(within(b).getByText('مستند')).toBeTruthy();
    expect(within(b).queryByRole('list')).toBeNull();
  });

  it('an old row (no template block): the name, the body, no buttons', () => {
    const b = bubble({ template: undefined });
    expect(within(b).getByText('حلقة سلمى اليوم')).toBeTruthy();
    expect(within(b).queryByRole('list', { name: 'أزرار القالب' })).toBeNull();
  });
});

describe('MessageBubble: the family tapped a template button', () => {
  it('their bubble marks the tap over the tapped label', () => {
    const payload = { type: 'button', button: { text: 'تأكيد', payload: 'confirm:l1' } };
    const b = bubble({ direction: 'inbound', status: 'delivered', template_key: null, body: 'تأكيد', interactive_payload: payload });
    expect(within(b).getByText('ضغطة زرّ')).toBeTruthy();
    expect(within(b).getByText('تأكيد')).toBeTruthy();
  });

  it('a typed text has no tap mark', () => {
    const b = bubble({ direction: 'inbound', status: 'delivered', template_key: null, body: 'تأكيد', interactive_payload: null });
    expect(within(b).queryByText('ضغطة زرّ')).toBeNull();
  });
});
