import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { findRow, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ manage: true }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: granted.manage ? ['notifications.manage'] : [], can: () => true }),
}));

const r = t.notificationRules;
const c = t.notificationCatalogue;
const name = c.entries.lesson_reminder.name;

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
  apiSend.mockReset();
  granted.manage = true;
});

describe('«الإشعارات» below 640px', () => {
  it('two columns (الإشعار | التشغيل), the state and reason under the name, no editor in the row', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    const heads = within(screen.getByRole('table')).getAllByRole('columnheader').map((h) => h.textContent);
    expect(heads).toEqual([r.columns.name, r.columns.switch]);
    expect(row.textContent).toContain(`${c.states.off} · ${c.blockers.messaging_off}`);
    expect(within(row).queryByRole('spinbutton')).toBeNull();
    expect(within(row).queryByRole('switch')).toBeNull();
  });

  it('a tap opens the bottom sheet with the editor; «حفظ» sends the change and closes it', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    fireEvent.click(within(row).getByRole('button', { name: new RegExp(r.phoneOpen.replace('{name}', name)) }));
    const sheet = screen.getByRole('dialog', { name });
    expect(within(sheet).getByRole('switch', { name: r.switchName.replace('{name}', name) })).toBeTruthy();
    fireEvent.change(within(sheet).getByLabelText(r.timing.minutesLabel), { target: { value: '30' } });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(sheet).getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder', { timing: { minutes_before: 30 } }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('without notifications.manage the sheet opens read-only', async () => {
    granted.manage = false;
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    fireEvent.click(within(row).getByRole('button', { name: new RegExp(r.phoneView.replace('{name}', name)) }));
    const sheet = screen.getByRole('dialog', { name });
    expect(within(sheet).queryByRole('spinbutton')).toBeNull();
    expect(within(sheet).queryByRole('switch')).toBeNull();
    expect(within(sheet).queryByRole('button', { name: t.common.save })).toBeNull();
    expect(within(sheet).getByText(r.timing.minutesText.replace('{n}', '60'))).toBeTruthy();
  });
});
