import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { detail, PHONE } from '../../testing/inbox-fixture';
import { InboxModeContext } from '../../shared/mode';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

describe('registering a new student from a sales chat, English', () => {
  it('the action and its dialog read in English', async () => {
    routeFetch(apiFetch, [['/threads/%2B966501234567', detail([])], ['/messaging/templates', []], ['/settings', {}]]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Register a new student' }));
    expect(screen.getByRole('dialog', { name: 'Register a new student' })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.booking.next })).toBeTruthy();
  });
});
