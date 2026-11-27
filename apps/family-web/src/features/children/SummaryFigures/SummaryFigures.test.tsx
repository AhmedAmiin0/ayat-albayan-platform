import type { ChildSummary } from '@ab/client-core';
import type { PortalPackage } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { SummaryFigures } from './SummaryFigures';

const summary = (over: Partial<ChildSummary> = {}): ChildSummary => ({
  upcoming: null,
  month: null,
  remaining: null,
  lastReport: null,
  newReports: 0,
  ...over,
});
const pkg: PortalPackage = {
  package: '12',
  duration: 30,
  lessons_total: 12,
  lessons_used: 8,
  remaining: 4,
  starts_on: '2026-10-01',
  renews_on: '2026-11-01',
  status: 'active',
  amount_due: { amount: 150, currency: 'SAR' },
};

describe('the quiet lines under the next lesson', () => {
  it('no report, no month and no package: only «no report yet»', async () => {
    renderAt(<SummaryFigures summary={summary()} pkg={null} tz="Africa/Cairo" studentId="s1" />);
    expect(await screen.findByText(t.portal.app.children.noReport)).toBeTruthy();
    expect(screen.queryByText(t.portal.thisMonth)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('this month: attended and absent as dots', async () => {
    const month = { attended: 3, absent: 2 };
    renderAt(<SummaryFigures summary={summary({ month })} pkg={null} tz="UTC" studentId="s1" />);
    expect(await screen.findByText(t.portal.thisMonth)).toBeTruthy();
    expect(screen.getByText(t.portal.monthAttended.replace('{n}', '3'))).toBeTruthy();
    expect(screen.getByText(t.portal.monthAbsent.replace('{n}', '2'))).toBeTruthy();
  });

  it('a package with an amount due: the link to it and the pill to act on', async () => {
    renderAt(<SummaryFigures summary={summary()} pkg={pkg} tz="UTC" studentId="s2" />);
    const open = await screen.findByRole('link', { name: new RegExp(t.portal.packageTab) });
    expect(open.getAttribute('href')).toBe('/package/s2');
    const due = screen.getByText(t.portal.amountDue, { exact: false });
    expect(due.getAttribute('data-tone')).toBe('act');
  });

  it('a package paid up: the link, no pill', async () => {
    const paid = { ...pkg, amount_due: null };
    renderAt(<SummaryFigures summary={summary()} pkg={paid} tz="UTC" studentId="s2" />);
    expect(await screen.findByRole('link', { name: new RegExp(t.portal.packageTab) })).toBeTruthy();
    expect(screen.queryByText(t.portal.amountDue, { exact: false })).toBeNull();
  });
});
