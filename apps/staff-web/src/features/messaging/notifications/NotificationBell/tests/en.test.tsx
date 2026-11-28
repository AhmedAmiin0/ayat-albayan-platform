import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockCall, type CallHandler } from '@ab/testing/mock-call';
import { NotificationBell } from '@/features/messaging/notifications/NotificationBell/NotificationBell';
import { ITEM, page, renderWithClient } from '@/features/messaging/notifications/notifications-test-kit';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const bellRead = vi.fn<CallHandler>();
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
mockApi.onRead(bellRead);
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

describe('NotificationBell, English', () => {
  it('names the bell, the panel and the push foot in English', async () => {
    bellRead.mockResolvedValue(page([ITEM]));
    renderWithClient(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeTruthy();
    expect(screen.getByText('This browser doesn’t support notifications.')).toBeTruthy();
  });
});
