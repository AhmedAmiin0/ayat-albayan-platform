import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { TemplateParamFields } from './TemplateParamFields';

function preview(patch: Parameters<typeof template>[0], values = {}) {
  render(<TemplateParamFields template={template(patch)} values={values} missing={[]} onChange={() => {}} />);
  return screen.getByRole('figure');
}

describe('the composer preview draws the template like WhatsApp (owner 2026-10-28)', () => {
  it('the synced header, the body, the grey footer and the buttons under it', () => {
    const fig = preview({
      body_ar: 'حلقة {{1}} اليوم',
      footer_ar: 'أكاديمية آيات البيان',
      display: {
        header: { type: 'text', text: 'تذكير' },
        buttons: [
          { type: 'quick_reply', text: 'تأكيد' },
          { type: 'phone_number', text: 'اتصل بنا', phone: '+966500000000' },
        ],
      },
    });
    expect(within(fig).getByText('تذكير').className).toContain('font-bold');
    expect(within(fig).getByText('أكاديمية آيات البيان')).toBeTruthy();
    const rows = within(within(fig).getByRole('list', { name: 'أزرار القالب' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('تأكيد'), expect.stringContaining('اتصل بنا')]);
  });

  it('a meeting button opens the link built from the code typed so far', () => {
    const fig = preview(
      { buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}', text: 'ادخل الحلقة' }] },
      { button: 'abc-defg-hij' },
    );
    const link = within(fig).getByRole('link', { name: 'ادخل الحلقة: يفتح الرابط' });
    expect(link.getAttribute('href')).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('no buttons: no button list', () => {
    const fig = preview({ buttons: [], display: null });
    expect(within(fig).queryByRole('list')).toBeNull();
  });
});
