import { SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { CATALOGUE_ROUTE } from '@/test/settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const meta = { booking_horizon_weeks: { updatedAt: '2026-10-04T08:00:00Z', updatedBy: 'u1', updatedByName: 'منى' } };

function renderPage() {
  routeFetch(apiFetch, [
    ['/config/meta', { meta }],
    ['/config/custom', []],
    ['/settings/integrations', []],
    ['/settings', SETTING_DEFAULTS],
    CATALOGUE_ROUTE,
    ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('settings page: custom-config additions', () => {
  it('shows the new settings, the custom panel and its index entry', async () => {
    renderPage();
    for (const label of [t.config.activityRetentionDays, t.config.recordingRetentionDays, t.config.academyContact, t.config.recordingConsentNotice]) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }
    const nav = screen.getByRole('navigation', { name: t.settings.nav });
    expect(within(nav).getAllByRole('link').at(-1)?.textContent).toBe(t.config.sections.custom);
    expect(await screen.findByRole('button', { name: t.config.custom.add })).toBeTruthy();
  });

  it('says who changed a setting last', async () => {
    renderPage();
    expect(await screen.findByText(/منى/)).toBeTruthy();
  });

  it('frames the sending and automatic-message switches as danger, keeping their dialogs', async () => {
    renderPage();
    await screen.findByRole('button', { name: t.templates.settings.enableTitle });
    expect(document.querySelectorAll('[data-danger="true"]').length).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: t.templates.settings.enableTitle }));
    expect(screen.getByRole('dialog', { name: t.templates.settings.enableTitle })).toBeTruthy();
  });

  it('the search box filters rows and sections, and says when nothing matches', async () => {
    renderPage();
    const box = await screen.findByLabelText(t.config.search.label);
    fireEvent.change(box, { target: { value: 'retention' } });
    expect(screen.getByText(t.config.activityRetentionDays)).toBeTruthy();
    expect(screen.queryByLabelText(t.settings.bookingHorizonWeeks)).toBeNull();
    expect(screen.queryByText(t.templates.settings.enableTitle)).toBeNull();
    fireEvent.change(box, { target: { value: 'zzzz-nothing' } });
    expect(screen.getByText(t.config.search.none)).toBeTruthy();
    fireEvent.change(box, { target: { value: '' } });
    expect(screen.getByLabelText(t.settings.bookingHorizonWeeks)).toBeTruthy();
  });

  it('a changed retention is sent with the rest; an invalid one stays on screen', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(t.config.activityRetentionDays), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent)).toEqual([t.settings.invalid]);
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(SETTING_DEFAULTS);
    fireEvent.change(screen.getByLabelText(t.config.activityRetentionDays), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', expect.objectContaining({ activityRetentionDays: 90, recordingRetentionDays: null })));
  });
});
