import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminNav } from './AdminNav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
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
    [t.translations.nav, '/admin/translations'],
    [t.nav.activity, '/admin/activity'],
    [t.finance.invoicesTitle, '/admin/invoices'],
    [t.finance.receivablesTitle, '/admin/receivables'],
    [t.finance.summaryTitle, '/admin/finance'],
    [t.nav.roles, '/admin/roles'],
  ])('links %s to %s', (label, href) => {
    render(<AdminNav />);
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(href);
  });

  it('links only the routes that exist: Phase 1 screens, schedule, money, pricing, inbox, settings, translations, activity and roles', () => {
    render(<AdminNav />);
    expect(screen.getAllByRole('link')).toHaveLength(21);
  });

  it('groups the money pages under «المالية»', () => {
    render(<AdminNav />);
    const money = screen.getByRole('list', { name: t.finance.nav });
    expect(money.querySelectorAll('a')).toHaveLength(7);
  });

  it('rhythm: 4px grid, 40px items (44 on phones and touch), 16px between groups, 8px label to list', () => {
    const { container } = render(<AdminNav />);
    const link = screen.getByRole('link', { name: t.nav.students });
    for (const c of ['px-3', 'gap-2', 'min-h-11', 'shell:min-h-10', 'shell:pointer-coarse:min-h-11']) {
      expect(link.className).toContain(c);
    }
    expect(container.querySelector('nav')?.className).toContain('shell:gap-4');
    const label = screen.getByText(t.finance.nav);
    expect(label.getAttribute('aria-hidden')).toBe('true');
    expect(label.className).toContain('px-3');
    expect(label.className).toContain('pb-1');
  });

  it('the current item gets a 4px inset bar on the inline-start (logical, RTL and LTR alike)', () => {
    render(<AdminNav />);
    const cls = screen.getByRole('link', { name: t.nav.students }).className;
    for (const c of ['before:w-1', 'before:start-0', 'before:inset-y-2', 'aria-[current=page]:before:bg-lapis']) {
      expect(cls).toContain(c);
    }
    expect(cls).not.toMatch(/border-s-|\b(?:pl|pr|ml|mr)-/);
  });

  it('a long label wraps in the sidebar (never an ellipsis, English «Your opinion matters»)', () => {
    render(<AdminNav />);
    const label = screen.getByText(t.nav.students);
    expect(label.className).toContain('shell:whitespace-normal');
    expect(label.className).not.toContain('truncate');
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
