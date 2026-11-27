import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { pageView } from '@ab/web-kit/report/page.fixture';
import { ReportPageBody } from './ReportPageBody';

const s = () => t.reportPage;
const teacherLine = () => s().teacher.replace('{name}', 'أبرار');

describe('ReportPageBody: the saved report, read-only', () => {
  it('the header names the student, the date and the teacher; lines and files follow', () => {
    render(<ReportPageBody view={pageView()} />);
    expect(screen.getByRole('article', { name: s().title })).toBeTruthy();
    expect(screen.getByText(/سهيلة/)).toBeTruthy();
    expect(screen.getByText(teacherLine())).toBeTruthy();
    expect(screen.getByText('أداء ممتاز')).toBeTruthy();
    expect(screen.getByText(t.reports.v2.attendance.on_time)).toBeTruthy();
    expect(screen.getByRole('link', { name: s().downloadPdf })).toBeTruthy();
    expect(screen.queryByText(s().edited)).toBeNull();
  });

  it('a blank line reads «no content»', () => {
    render(<ReportPageBody view={pageView()} />);
    expect(screen.getAllByText(t.mobileAdmin.reports.noContent).length).toBeGreaterThan(0);
  });

  it('inside a lesson row (head false) the header is left out; an edit is marked', () => {
    const view = pageView();
    const edited = { ...view, report: { ...view.report, edited_at: '2026-10-05T09:00:00Z' } };
    render(<ReportPageBody view={edited} head={false} />);
    expect(screen.queryByText(teacherLine())).toBeNull();
    expect(screen.getByText(s().edited)).toBeTruthy();
  });
});
