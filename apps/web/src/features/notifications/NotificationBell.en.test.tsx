import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { ITEM, page, renderWithClient } from './notifications-test-kit';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

describe('NotificationBell, English', () => {
  it('names the bell, the panel and the push foot in English', async () => {
    apiFetch.mockResolvedValue(page([ITEM]));
    renderWithClient(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeTruthy();
    expect(screen.getByText('This browser doesn’t support notifications.')).toBeTruthy();
  });
});
