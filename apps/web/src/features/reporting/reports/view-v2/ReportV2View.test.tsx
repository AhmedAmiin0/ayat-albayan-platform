import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openV2, v2Content } from '../entry-v2/v2-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const v2 = t.reports.v2;
const sent = { status: 'submitted' as const, version: 1, attendance: 'on_time' as const, pdf_status: 'ready' as const, can_edit: false };

describe('the admin reads a new-form report (read-only)', () => {
  afterEach(() => apiFetch.mockReset());

  it('badge, attendance, program, each part with its range and grade, tajweed, overall, plan and note', async () => {
    const content = v2Content({
      segments: [
        { kind: 'recited', surah: 67, from: 1, to: 15, grade: 'excellent' },
        { kind: 'new', surah: 67, from: 16, to: 22, grade: 'very_good' },
      ],
      tajweed: 'madd',
      quick: ['keep_going'],
    });
    const report = { ...sent, content, grade_overall: 'very_good' as const, homework: 'مراجعة الملك', next_plan: 'الملك 23–29', notes: 'تحسّن واضح' };
    const article = await openV2({ apiFetch, role: 'admin', report });
    const text = article.textContent ?? '';
    expect(screen.getByText(v2.admin.v2Badge)).toBeTruthy();
    expect(screen.getByText(v2.attendance.on_time)).toBeTruthy();
    expect(screen.getByText(`سورة الملك · الآيات 1–15 · ${t.enums.grade.excellent}`)).toBeTruthy();
    expect(screen.getByText(`سورة الملك · الآيات 16–22 · ${t.enums.grade.very_good}`)).toBeTruthy();
    for (const word of [v2.tajweed.madd, 'مراجعة الملك', 'الملك 23–29', 'أحسنت، استمر. تحسّن واضح', t.enums.program.quran]) {
      expect(text).toContain(word);
    }
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: v2.send })).toBeNull();
    expect(screen.getByRole('button', { name: t.reports.downloadPdf })).toBeTruthy();
  });

  it('absent: the attendance line and the note only', async () => {
    const article = await openV2({ apiFetch, role: 'admin', report: { ...sent, attendance: 'absent', notes: 'نرجو الإبلاغ' } });
    expect(screen.getByText(v2.attendance.absent)).toBeTruthy();
    expect(screen.getByText('نرجو الإبلاغ')).toBeTruthy();
    expect(article.textContent).not.toContain(v2.overall);
    expect(article.textContent).not.toContain(v2.programTitle);
  });

  it('a v1 report still opens the old form for the admin', async () => {
    await openV2({ apiFetch, role: 'admin', report: { form_version: 1, content: null } });
    expect(screen.getByRole('region', { name: t.reports.identity })).toBeTruthy();
    expect(screen.queryByText(v2.admin.v2Badge)).toBeNull();
  });

  it('«تعديل التقرير» opens the new form for the admin (admins correct any report); a draft opens in the form', async () => {
    await openV2({ apiFetch, role: 'admin', report: { ...sent, can_edit: true, content: v2Content({}) } });
    expect(screen.queryByRole('button', { name: v2.saveEdit })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.reports.edit }));
    expect(await screen.findByRole('button', { name: v2.saveEdit })).toBeTruthy();
    expect(screen.queryByText(v2.admin.v2Badge)).toBeNull();
  });
});
