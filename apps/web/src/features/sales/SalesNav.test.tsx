import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SalesNav } from './SalesNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('SalesNav', () => {
  it('has exactly my three pages in order: chats, subscriptions, meetings', () => {
    render(<SalesNav />);
    const nav = screen.getByRole('navigation', { name: t.sales.nav.label });
    expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['المحادثات', '/sales/inbox'],
      ['الاشتراكات', '/sales/subscriptions'],
      ['مواعيدي', '/sales/meetings'],
    ]);
  });

  it('is a fixed bottom bar of three 56px tabs on a phone, a top row from sm up', () => {
    render(<SalesNav />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toMatch(/fixed .*bottom-0/);
    expect(nav.className).toContain('sm:static');
    expect(nav.querySelector('ul')?.className).toContain('grid-cols-3');
    for (const link of screen.getAllByRole('link')) expect(link.className).toContain('min-h-14');
  });
});
