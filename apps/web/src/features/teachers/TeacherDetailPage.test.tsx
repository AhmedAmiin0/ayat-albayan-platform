import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';
import { TeacherDetailPage } from './TeacherDetailPage';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const FATMA: Teacher = {
  id: 't1',
  display_name_ar: 'فاطمة الزهراء',
  display_name_en: 'Fatma',
  gender: 'female',
  programs: ['quran'],
  phone_e164: '+201066123049',
  meeting_link: 'https://meet.google.com/xqa-ngdu-fpe',
  status: 'active',
  tz: 'Africa/Cairo',
  rate_30: 60,
  rate_45: 85,
  rate_60: null,
  rate_90: null,
  max_students: 12,
};
const RESPONSES: Record<string, unknown> = {
  '/teachers/t1': FATMA,
  '/teachers/t1/availability': [{ id: 'a1', weekday: 6, start_time: '15:00', end_time: '18:00', tz: 'Africa/Cairo' }],
  '/teachers/t1/time-off': [{ id: 'o1', starts_at: '2026-10-10T00:00:00Z', ends_at: '2026-10-10T08:00:00Z', reason: 'سفر' }],
};

function renderPage() {
  apiFetch.mockImplementation((path: string) => Promise.resolve(RESPONSES[path]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherDetailPage teacherId="t1" />
    </QueryClientProvider>,
  );
}

describe('TeacherDetailPage (R-TCH-01, R-TCH-02, docs/07 §8)', () => {
  it('heads the profile with the name cartouche, status chip and the meta line', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'فاطمة الزهراء' })).toBeTruthy();
    const chip = screen.getByText(t.enums.teacherStatus.active).parentElement;
    expect(chip?.querySelector('[data-glyph="fill"]')).toBeTruthy();
    expect(screen.getByText(`${t.teachers.genderLabel.female}${t.common.listSeparator}${t.enums.program.quran}`)).toBeTruthy();
    expect(screen.getAllByText('+20 10 6612 3049')[0]?.getAttribute('dir')).toBe('ltr');
    expect(screen.getByRole('link', { name: 'meet.google.com/xqa-ngdu-fpe' }).getAttribute('href')).toBe(FATMA.meeting_link);
  });

  it('opens on the availability tab: week editor, time-off and rates in Western digits', async () => {
    renderPage();
    const tab = await screen.findByRole('tab', { name: t.availability.title });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByRole('table', { name: t.availability.title })).toBeTruthy();
    expect(await screen.findByText(`${t.availability.reason}: سفر`)).toBeTruthy();
    const rates = screen.getByRole('heading', { name: t.teachers.rates }).parentElement;
    if (!rates) throw new Error('rates missing');
    expect(within(rates).getByRole('rowheader', { name: t.teachers.rate30 })).toBeTruthy();
    expect(within(rates).getByText('85')).toBeTruthy();
    expect(within(rates).queryByText(t.teachers.rate60)).toBeNull();
  });

  it('keeps one filled primary on screen (حفظ المواعيد); editing is secondary', async () => {
    renderPage();
    await screen.findByRole('table', { name: t.availability.title });
    const primaries = [...document.querySelectorAll('button')].filter((b) => b.className.includes('bg-primary '));
    expect(primaries.map((b) => b.textContent)).toEqual([t.availability.save]);
    fireEvent.click(screen.getByRole('button', { name: t.teachers.edit }));
    expect(screen.getByRole('dialog', { name: t.teachers.edit })).toBeTruthy();
  });

  it('«البيانات» tab lists the record, LTR values isolated', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: t.teachers.tabData }));
    const panel = screen.getByRole('tabpanel', { name: t.teachers.tabData });
    expect(within(panel).getByText('Africa/Cairo').getAttribute('dir')).toBe('ltr');
    expect(within(panel).getByText('Fatma')).toBeTruthy();
    expect(screen.queryByRole('table', { name: t.availability.title })).toBeNull();
  });

  it('«الطلاب» tab: her students from the students list API, teacher fixed (R-TCH-03)', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: t.teachers.tabStudents }));
    const panel = screen.getByRole('tabpanel', { name: t.teachers.tabStudents });
    expect(within(panel).getByRole('heading', { name: t.teachers.studentsTitle })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/status-counts?teacher=t1');
  });

  it('links to «مستحقات المعلم» for this teacher', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: t.earnings.title });
    expect(link.getAttribute('href')).toBe('/admin/teachers/t1/earnings');
  });
});
