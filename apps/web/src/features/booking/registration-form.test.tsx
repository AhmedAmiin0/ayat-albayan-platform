import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SourceField } from '@/features/guardians/SourceField';
import { t } from '@/lib/i18n';
import { ByDayPicker } from './ByDayPicker';
import { emptyDraft } from './draft';
import { LeadStudentStep } from './LeadStudentStep';
import { PackageStep } from './PackageStep';

// استمارة تسجيل طالب جديد: the wizard's titles, options and stars are the Google Form's.
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(async () => ({ total: 0, currency: 'SAR', fx: null })) }));

const wrap = (ui: React.ReactNode) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

describe('registration form wording', () => {
  it('«الباقة المطلوبة *» offers exactly the form’s five options, in its order, with its wording', () => {
    render(wrap(<PackageStep draft={emptyDraft()} onChange={vi.fn()} />));
    const group = screen.getByRole('group', { name: 'الباقة المطلوبة' });
    expect(within(group).getAllByRole('radio').map((r) => r.closest('label')?.querySelector('span')?.textContent)).toEqual([
      'حلقة تجريبية مجانية بس',
      '4 حلقات في الشهر',
      '8 حلقات',
      '12 حلقة',
      '16 حلقة في الشهر',
    ]);
    expect(group.querySelector('legend')?.textContent).toBe('الباقة المطلوبة *');
  });

  it('«المده» offers 30 / 45 / 60 / 90 دقيقة', () => {
    render(wrap(<PackageStep draft={emptyDraft()} onChange={vi.fn()} />));
    const select = screen.getByLabelText('المده');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة']);
  });

  it('«الأيام المتاحة *» runs السبت → الجمعة', () => {
    render(<ByDayPicker fixed={0} value={[0]} onChange={vi.fn()} />);
    const legend = screen.getByRole('group').querySelector('legend');
    expect(legend?.textContent).toContain('الأيام المتاحة *');
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual([
      'السبت',
      'الأحد',
      'الاتنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
    ]);
  });

  it('«عرفت عننا منين؟» has the four options, «أخرى» only for a row that already has it', () => {
    const { unmount } = render(<SourceField value="" onChange={vi.fn()} />);
    const labels = (el: HTMLElement) => within(el).getAllByRole('option').map((o) => o.textContent);
    expect(labels(screen.getByLabelText('عرفت عننا منين؟'))).toEqual(['—', 'إعلان فيسبوك', 'إعلان انستجرام', 'واتساب مباشر', 'صديق أو معرفة']);
    unmount();
    render(<SourceField value="other" onChange={vi.fn()} />);
    expect(labels(screen.getByLabelText('عرفت عننا منين؟'))).toContain(t.enums.leadSource.other);
  });

  it('the first step asks name, WhatsApp, age, gender, source in the form’s order (and no program)', () => {
    render(
      <LeadStudentStep
        value={{ name: '', guardianName: '', guardianPhone: '' }}
        tz="Asia/Riyadh"
        onChange={vi.fn()}
      />,
    );
    const order = ['اسم الطالب', 'رقم الواتساب (مع كود الدولة)', 'سن الطالب', 'النوع', 'عرفت عننا منين؟'];
    const text = document.body.textContent ?? '';
    const at = order.map((x) => text.indexOf(x));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(screen.queryByLabelText(t.students.program)).toBeNull();
    expect(screen.getByLabelText('رقم الواتساب (مع كود الدولة)').getAttribute('aria-required')).toBe('true');
  });
});
