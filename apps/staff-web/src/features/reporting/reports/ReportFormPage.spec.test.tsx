import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { formResponse, reportView } from './report-fixture';
import { ReportFormPage } from './ReportFormPage';

// تقرير الحلقة: the form's section headings, field titles and their order (the Google Form's).
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

async function open(over: Parameters<typeof formResponse>[1] = {}) {
  apiFetch.mockImplementation((path: string) => Promise.resolve(path === '/lessons/l-1/report-form' ? formResponse({}, over) : []));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReportFormPage lessonId="l-1" role="teacher" />
    </QueryClientProvider>,
  );
  return screen.findByRole('region', { name: 'بيانات الحلقة' });
}

describe('تقرير الحلقة: titles and order', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('«بيانات الحلقة» runs: id, teacher, student, date, number, program *, attendance *, link', async () => {
    const identity = await open();
    const order = [
      'معرّف الطالب (لا تعدله)',
      'اسم المعلم (لا تعدله)',
      'اسم الطالب (لا تعدله)',
      'تاريخ الحلقة',
      'رقم الحلقة',
      'البرنامج',
      'الحضور',
      'رابط الاجتماع',
    ];
    const text = identity.textContent ?? '';
    const at = order.map((x) => text.indexOf(x));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(within(identity).getByText('AB-0183')).toBeTruthy();
    expect(within(identity).getByRole('group', { name: 'البرنامج' }).querySelector('legend')?.textContent).toBe('البرنامج *');
  });

  it('the program is the form’s three options, the student’s one picked, and the other sections have its headings', async () => {
    const identity = await open();
    const program = within(identity).getByRole('group', { name: 'البرنامج' });
    expect(within(program).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'القرآن الكريم',
      'اللغة العربية',
      'الدراسات الإسلامية',
    ]);
    expect(within(program).getByRole('radio', { name: 'القرآن الكريم' })).toHaveProperty('checked', true);
    for (const heading of ['محتوى الحلقة', 'التقييم التفصيلي', 'الملاحظات والواجب']) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    }
    expect(screen.getByText('تقييم البنود')).toBeTruthy();
  });

  it('a changed program is saved with the draft', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    apiSend.mockResolvedValue(reportView());
    const identity = await open();
    fireEvent.click(within(identity).getByRole('radio', { name: 'اللغة العربية' }));
    await vi.advanceTimersByTimeAsync(1000);
    // React 19 renders the debounce timer update in a later scheduler task, after the advance.
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/reports/r-1/draft', expect.objectContaining({ program: 'arabic' })),
    );
    vi.useRealTimers();
    expect(t.enums.program.islamic_studies).toBe('الدراسات الإسلامية');
  });
});
