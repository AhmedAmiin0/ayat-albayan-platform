import { act, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setClockPref } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { findRow, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }),
}));

const tm = t.notificationRules.timing;
const unsaved = () => document.querySelector('[data-unsaved="lesson_reminder_24h"]')?.textContent ?? '';

afterEach(() => {
  apiFetch.mockReset();
  act(() => setClockPref('24'));
});

describe('«الإشعارات»: the unsaved timing words follow «تنسيق الوقت»', () => {
  it('24 h, then a switch to 12 h re-words the draft without a remount', async () => {
    act(() => setClockPref('24'));
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder_24h');
    fireEvent.change(within(row).getByLabelText(tm.dayBeforeLabel), { target: { value: '20:00' } });
    expect(unsaved()).toContain(tm.dayBeforeText.replace('{time}', '20:00'));

    act(() => setClockPref('12'));
    expect(unsaved()).toContain(tm.dayBeforeText.replace('{time}', '8:00 م'));
    expect(unsaved()).not.toContain('20:00');
  });
});
