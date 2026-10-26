import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { badgeText, NotificationBell } from './NotificationBell';
import { ITEM, page, READ_ITEM, renderWithClient } from './notifications-test-kit';

const granted = vi.hoisted(() => new Set<string>());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

const bell = () => screen.findByRole('button', { name: t.bell.openUnread.replace('{n}', '1') });

beforeEach(() => {
  granted.clear();
  granted.add('notifications.push');
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(page([ITEM, READ_ITEM]));
});

describe('NotificationBell', () => {
  it('renders nothing (and asks nothing) without notifications.push', () => {
    granted.clear();
    const { container } = renderWithClient(<NotificationBell />);
    expect(container.innerHTML).toBe('');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('names the unread count on the button; the badge is decorative and capped at 9+', async () => {
    apiFetch.mockResolvedValue(page([ITEM], 12));
    renderWithClient(<NotificationBell />);
    const button = await screen.findByRole('button', { name: t.bell.openUnread.replace('{n}', '12') });
    const badge = button.querySelector('[aria-hidden="true"]:not(svg)');
    expect(badge?.textContent).toBe('9+');
    expect(apiFetch).toHaveBeenCalledWith('/me/notifications?page=1&pageSize=20');
    expect([badgeText(1), badgeText(9), badgeText(10)]).toEqual(['1', '9', '9+']);
  });

  it('no badge and the plain name when everything is read', async () => {
    apiFetch.mockResolvedValue(page([READ_ITEM]));
    renderWithClient(<NotificationBell />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const button = screen.getByRole('button', { name: t.bell.open });
    expect(button.querySelector('span')).toBeNull();
  });

  it('opens the panel; Esc closes it and focus returns to the bell', async () => {
    renderWithClient(<NotificationBell />);
    const button = await bell();
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByRole('heading', { name: t.bell.title })).toBeTruthy();
    expect(await screen.findByText(ITEM.title)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: t.bell.title })).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('a tap outside closes it; a tap inside does not', async () => {
    renderWithClient(
      <>
        <NotificationBell />
        <p>outside</p>
      </>,
    );
    fireEvent.click(await bell());
    const heading = await screen.findByRole('heading', { name: t.bell.title });
    fireEvent.pointerDown(heading);
    expect(screen.getByRole('heading', { name: t.bell.title })).toBeTruthy();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(screen.queryByRole('heading', { name: t.bell.title })).toBeNull();
  });

  it('the panel drops from the inline end of the bell', async () => {
    renderWithClient(<NotificationBell />);
    fireEvent.click(await bell());
    const panel = (await screen.findByRole('heading', { name: t.bell.title })).closest('.absolute');
    expect(panel?.className.split(' ')).toEqual(expect.arrayContaining(['end-0', 'top-full', 'shadow-pop', 'bg-card']));
  });
});
