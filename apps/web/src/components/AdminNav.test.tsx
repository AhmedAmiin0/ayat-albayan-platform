import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminNav } from './AdminNav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

describe('AdminNav', () => {
  it.each([
    [t.nav.students, '/admin/students'],
    [t.nav.teachers, '/admin/teachers'],
    [t.nav.leads, '/admin/leads'],
    [t.nav.jobApplicants, '/admin/job-applicants'],
    [t.pricing.title, '/admin/pricing'],
    [t.schedule.nav, '/admin/schedule'],
    [t.nav.subscriptions, '/admin/subscriptions'],
    [t.payments.title, '/admin/payments'],
    [t.nav.payouts, '/admin/payouts'],
    [t.nav.expenses, '/admin/expenses'],
    [t.nav.inbox, '/admin/inbox'],
    [t.nav.feedback, '/admin/feedback'],
    [t.classroom.admin.nav, '/admin/classrooms'],
    [t.settings.title, '/admin/settings'],
    [t.nav.activity, '/admin/activity'],
    [t.finance.invoicesTitle, '/admin/invoices'],
    [t.finance.receivablesTitle, '/admin/receivables'],
    [t.finance.summaryTitle, '/admin/finance'],
  ])('links %s to %s', (label, href) => {
    render(<AdminNav />);
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
  });

  it('links only the routes that exist: Phase 1 screens, schedule, money, pricing, inbox, settings and the activity log', () => {
    render(<AdminNav />);
    expect(screen.getAllByRole('link')).toHaveLength(18);
  });

  it('groups the money pages under «المالية»', () => {
    render(<AdminNav />);
    const money = screen.getByRole('list', { name: t.finance.nav });
    expect(money.querySelectorAll('a')).toHaveLength(7);
  });

  it('shows real counts; work counts are saffron and say what they are', () => {
    const newLeads = t.nav.newLeads.replace('{n}', '11');
    render(<AdminNav counts={{ leads: { text: newLeads, act: true }, students: { text: '64' } }} />);
    expect(screen.getByRole('link', { name: `${t.nav.leads} ${newLeads}` })).toBeTruthy();
    expect(screen.getByText(newLeads).className).toContain('text-act');
    expect(screen.getByText('64').className).toContain('text-ink-3');
    expect(screen.getByRole('link', { name: t.nav.teachers })).toBeTruthy();
  });
});
