import { fireEvent, within } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { findRow, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }),
}));

const tm = t.notificationRules.timing;
const unsaved = () => document.querySelector('[data-unsaved="lesson_reminder_24h"]')?.textContent ?? '';

afterEach(() => {
  apiFetch.mockReset();
  localStorage.removeItem(CLOCK_STORAGE_KEY);
});

describe('«الإشعارات»: the unsaved timing words on the web', () => {
  it('read 12 h even with a saved 24 h choice', async () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder_24h');
    fireEvent.change(within(row).getByLabelText(tm.dayBeforeLabel), { target: { value: '20:00' } });
    expect(unsaved()).toContain(tm.dayBeforeText.replace('{time}', '8:00 م'));
    expect(unsaved()).not.toContain('20:00');
  });
});
