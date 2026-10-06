import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SalesNav } from './SalesNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('SalesNav', () => {
  it('has the assistant’s pages in order: chats, register, my students, subscriptions, meetings, payments, earnings', () => {
    render(<SalesNav />);
    const nav = screen.getByRole('navigation', { name: t.sales.nav.label });
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['المحادثات', '/sales/inbox'],
      ['تسجيل طالب', '/sales/register'],
      ['طلابي', '/sales/students'],
      ['الاشتراكات', '/sales/subscriptions'],
      ['مواعيدي', '/sales/meetings'],
      ['مدفوعاتي', '/sales/payments'],
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
