import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { PHONE, template } from './inbox-fixture';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// trial_reschedule's one variable is the recipient's name: it starts as the thread's display name.
const RESCHEDULE = template({
  key: 'trial_reschedule',
  body_ar: 'السلام عليكم {{1}}،\nنودّ إعادة جدولة موعد الحلقة التجريبية.\nما الوقت الذي يناسبكم؟',
  params: ['contact_name'],
  line: 'chat',
  sales_starter: true,
});

afterEach(() => apiFetch.mockReset());

describe('TemplateComposer — contact_name', () => {
  it('is labelled «اسم المُرسَل إليه», prefilled with the display name, and stays editable', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [RESCHEDULE]]]);
    renderWithClient(<TemplateComposer phone={PHONE} context={{ contactName: 'أم سهيلة' }} teacher={false} />);
    await screen.findByRole('option', { name: /إعادة جدولة الحلقة التجريبية|trial_reschedule/ });
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.chooseTemplate }), {
      target: { value: 'trial_reschedule' },
    });
    const field = screen.getByLabelText<HTMLInputElement>('اسم المُرسَل إليه', { exact: true });
    expect(field.value).toBe('أم سهيلة');
    fireEvent.change(field, { target: { value: 'أبو سهيلة' } });
    expect(field.value).toBe('أبو سهيلة');
  });
});
