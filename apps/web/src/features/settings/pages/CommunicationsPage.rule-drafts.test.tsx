import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findRow, overview } from '@/features/notification-rules/rules-test-kit';
import { t } from '@/lib/i18n';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }) }));

const r = t.notificationRules;
const name = t.notificationCatalogue.entries.lesson_reminder.name;
const minutesOf = (row: HTMLElement) => within(row).getByLabelText(r.timing.minutesLabel) as HTMLInputElement;
const commsTab = (label: string) => fireEvent.click(screen.getByRole('tab', { name: label }));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// Finding 1: the «الإشعارات» row drafts live above «التواصل»'s tabs.
describe('«التواصل»: the «الإشعارات» row drafts', () => {
  it('survive a switch to another «التواصل» tab and back', async () => {
    renderCommunications({ apiFetch, tab: 'catalogue', catalogue: overview() });
    fireEvent.change(minutesOf(await findRow('lesson_reminder')), { target: { value: '45' } });
    commsTab(t.settingsPages.communicationsTabs.templates);
    expect(screen.queryByRole('region', { name: r.title })).toBeNull();
    commsTab(r.tabLabel);
    expect(minutesOf(await findRow('lesson_reminder')).value).toBe('45');
    expect(document.querySelector('[data-unsaved="lesson_reminder"]')).not.toBeNull();
  });

  it('the leave guard names the dirty rows; typed back, the name goes', async () => {
    const guard = vi.fn((names: readonly string[]) => <span data-testid="guard">{names.join('|')}</span>);
    renderCommunications({ apiFetch, tab: 'catalogue', catalogue: overview(), renderGuard: guard });
    const minutes = minutesOf(await findRow('lesson_reminder'));
    expect(screen.getByTestId('guard').textContent).toBe('');
    fireEvent.change(minutes, { target: { value: '45' } });
    expect(screen.getByTestId('guard').textContent).toBe(name);
    fireEvent.change(minutes, { target: { value: '60' } });
    expect(screen.getByTestId('guard').textContent).toBe('');
  });
});
