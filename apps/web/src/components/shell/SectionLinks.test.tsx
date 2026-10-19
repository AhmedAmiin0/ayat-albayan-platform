import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SectionLinks, type SectionLink } from './SectionLinks';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const unread = t.nav.unread.replace('{n}', '3');
const ITEMS: readonly SectionLink[] = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read', count: unread },
  { to: '/sales/live', label: t.sales.nav.live, icon: 'clock', permission: 'self.sales_academy' },
];

describe('SectionLinks counts', () => {
  it('renders an item’s count after its label, inside the link’s accessible name', () => {
    render(<SectionLinks label={t.sales.nav.label} items={ITEMS} />);
    const chats = screen.getByRole('link', { name: `${t.sales.nav.chats} ${unread}` });
    expect(chats.getAttribute('href')).toBe('/sales/inbox');
    expect(chats.lastElementChild?.textContent).toBe(unread);
  });

  it('an item without a count is unchanged: its name is the label alone', () => {
    render(<SectionLinks label={t.sales.nav.label} items={ITEMS} />);
    const live = screen.getByRole('link', { name: t.sales.nav.live });
    expect(live.textContent).toBe(t.sales.nav.live);
    expect(live.querySelectorAll('span')).toHaveLength(1);
  });

  it('still filters by permission', () => {
    render(<SectionLinks label={t.sales.nav.label} items={ITEMS} can={(p) => p !== 'inbox.read'} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText(unread)).toBeNull();
  });
});
