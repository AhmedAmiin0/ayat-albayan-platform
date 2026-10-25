import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { findRow, openTab, overview, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ manage: false }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: granted.manage ? ['settings.read', 'notifications.manage'] : ['settings.read'], can: () => true }),
}));

const r = t.notificationRules;
const c = t.notificationCatalogue;

afterEach(() => {
  apiFetch.mockReset();
  granted.manage = false;
});

describe('«الإشعارات» rendering', () => {
  it('without notifications.manage: «للاطلاع فقط», timings as text, no input, select or switch', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    const region = screen.getByRole('region', { name: r.title });
    expect(within(region).getByText(r.readOnly)).toBeTruthy();
    expect(within(row).getByText(r.timing.minutesText.replace('{n}', '60'))).toBeTruthy();
    expect(within(region).queryAllByRole('spinbutton')).toHaveLength(0);
    expect(within(region).queryAllByRole('combobox')).toHaveLength(0);
    expect(within(region).queryAllByRole('switch')).toHaveLength(0);
    expect(within(row).getByText(t.settingsValues.on)).toBeTruthy();
  });

  it('the state strip names sending and automatic messages and links to «الإرسال»', async () => {
    renderRules({ apiFetch });
    const strip = await screen.findByRole('group', { name: r.strip.label });
    expect(strip.textContent).toContain(t.settingsPages.sendingState.replace('{state}', t.templates.settings.off));
    expect(strip.textContent).toContain(r.strip.autoOff);
    expect(within(strip).getByRole('link', { name: t.communicationsHub.openOverview }).getAttribute('href')).toMatch(/^\/admin\/settings\/communications\??$/);
  });

  it('«معتمد جزئيًا» when only some template variants are approved; classroom_off says why in MSA', async () => {
    granted.manage = true;
    const data = overview({ lesson_reminder: { approval: 'some' }, lesson_join_link: { state: 'off', blocker: 'classroom_off' } });
    renderRules({ apiFetch, data });
    const reminder = await findRow('lesson_reminder');
    expect(within(reminder).getByText(r.approval.some)).toBeTruthy();
    expect(within(reminder).getByText(r.approvalSomeHint)).toBeTruthy();
    const join = await findRow('lesson_join_link');
    expect(within(join).getByText(r.blockers.classroom_off)).toBeTruthy();
    expect(within(join).getByText(c.states.off)).toBeTruthy();
    expect(within(join).getByText(r.timing.withReminder)).toBeTruthy();
  });

  it('renewal shows the «القيم» value by reference with a link to its group', async () => {
    granted.manage = true;
    renderRules({ apiFetch });
    const row = await findRow('renewal_due');
    expect(within(row).getByText(r.timing.renewalRef.replace('{n}', '2'))).toBeTruthy();
    expect(within(row).getByRole('link', { name: r.timing.renewalLink }).getAttribute('href')).toBe('/admin/settings/values?group=accounts');
    expect(within(row).queryByRole('spinbutton')).toBeNull();
  });

  it('«يدوي» lists the manual messages with where each is sent from, and no switch', async () => {
    granted.manage = true;
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    openTab(c.states.manual);
    const row = await findRow('lesson_feedback_request');
    expect(within(row).getByText(c.entries.lesson_feedback_request.trigger)).toBeTruthy();
    expect(screen.getByText(r.manualIntro)).toBeTruthy();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    fireEvent.click(screen.getByRole('tab', { name: new RegExp(c.audience.guardian) }));
    expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
  });
});
