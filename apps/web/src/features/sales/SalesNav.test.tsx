import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SalesNav } from './SalesNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('SalesNav', () => {
  it('has the salesperson’s pages in order: chats, students, teachers, running lessons, the schedule, subscriptions, earnings (no meetings)', () => {
    render(<SalesNav />);
    const nav = screen.getByRole('navigation', { name: t.sales.nav.label });
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['المحادثات', '/sales/inbox'],
      ['الطلاب', '/sales/students'],
      ['المعلمون', '/sales/teachers'],
      ['الحلقات الجارية', '/sales/live'],
      ['جدول الحلقات', '/sales/schedule'],
      ['الاشتراكات', '/sales/subscriptions'],
      ['أرباحي', '/sales/earnings'],
    ]);
  });

  it('no fixed bottom bar: a vertical list of 44px rows (the sheet), a row from 900px', () => {
    render(<SalesNav />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).not.toMatch(/fixed/);
    expect(nav.querySelector('ul')?.className).toContain('shell:flex-row');
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-11');
  });
});
