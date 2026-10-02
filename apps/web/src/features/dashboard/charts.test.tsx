import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SUMMARY } from './dashboard-fixture';
import { ExpensesByCategory } from './ExpensesByCategory';
import { FinanceByMonth } from './FinanceByMonth';
import { FunnelChart } from './FunnelChart';
import { LessonsByStatus } from './LessonsByStatus';
import { SourceTable } from './SourceTable';
import { loadLabel, TeacherLoad } from './TeacherLoad';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./link-mock')).Link }));

const shares = (el: HTMLElement) => [...el.querySelectorAll('[data-share]')].map((b) => b.getAttribute('data-share'));

describe('dashboard charts (one bar system, each a labelled table)', () => {
  it('funnel: four stages, all leads first, conversion from the stage before', () => {
    render(<FunnelChart funnel={SUMMARY.funnel} />);
    const table = screen.getByRole('table', { name: t.dashboard.funnel });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      t.dashboard.leadsInRange,
      t.enums.leadStatus.trial_booked,
      t.enums.leadStatus.trial_done,
      t.enums.leadStatus.converted,
    ]);
    expect(rows[1]?.textContent).toContain('30%');
    expect(shares(table)[0]).toBe('1.000');
  });

  it('lessons by status: only statuses with lessons, each with its chip word', () => {
    render(<LessonsByStatus counts={SUMMARY.lessons_by_status} />);
    const table = screen.getByRole('table', { name: t.dashboard.lessonsByStatus });
    expect(within(table).getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      t.enums.lessonStatus.scheduled,
      t.enums.lessonStatus.completed,
      t.enums.lessonStatus.no_show,
    ]);
    expect(shares(table)).toEqual(['0.500', '1.000', '0.500']);
  });

  it('no lessons: one plain line', () => {
    render(<LessonsByStatus counts={{ ...SUMMARY.lessons_by_status, scheduled: 0, completed: 0, no_show: 0 }} />);
    expect(screen.getByText(t.dashboard.noLessons)).toBeTruthy();
  });

  it('teacher load: students against the maximum, a meter toward max', () => {
    expect(loadLabel({ students: 4, max_students: 12 })).toBe('4 من 12');
    expect(loadLabel({ students: 4, max_students: null })).toBe('4');
    render(<TeacherLoad rows={SUMMARY.teacher_load} />);
    const table = screen.getByRole('table', { name: t.dashboard.teacherLoad });
    expect(shares(table)).toEqual(['0.333']);
    expect(within(table).getByRole('link', { name: 'فاطمة الزهراء' }).getAttribute('href')).toBe('/admin/teachers/t1');
  });

  it('money by month: the three measures share one scale; the margin is a signed number', () => {
    render(<FinanceByMonth months={SUMMARY.finance.by_month} currency="SAR" />);
    const table = screen.getByRole('table', { name: `${t.dashboard.byMonth} (SAR)` });
    expect(shares(table)).toEqual(['0.101', '0.000', '1.000', '0.032', '0.009', '0.026']);
    expect(table.textContent).toContain('-1,294');
  });

  it('by source: a guardian without a source reads «مش معروف»; ad spend note under it', () => {
    render(<SourceTable rows={SUMMARY.finance.by_source} />);
    expect(screen.getByRole('rowheader', { name: t.dashboard.unknownSource })).toBeTruthy();
    expect(screen.getByText(t.dashboard.adSpendNote)).toBeTruthy();
  });

  it('expenses by category: only categories with spend; none → one line', () => {
    const { unmount } = render(<ExpensesByCategory byCategory={SUMMARY.finance.expenses_by_category} />);
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      t.enums.expenseCategory.ads,
      t.enums.expenseCategory.content,
      t.enums.expenseCategory.tools,
    ]);
    unmount();
    render(<ExpensesByCategory byCategory={{ ads: 0, content: 0, tools: 0, operations: 0, other: 0 }} />);
    expect(screen.getByText(t.dashboard.noExpenses)).toBeTruthy();
  });
});
