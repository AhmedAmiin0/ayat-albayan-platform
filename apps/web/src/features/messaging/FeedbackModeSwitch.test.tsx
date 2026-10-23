import { useQuery } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { SETTINGS } from '@/test/settings-fixture';
import { FeedbackModeSwitch } from './FeedbackModeSwitch';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.templates.settings;

/** The switch as the page mounts it: fed by GET /settings, so a save shows through the cache. */
function Harness() {
  const settings = useQuery(settingsQuery);
  return settings.data ? <FeedbackModeSwitch settings={settings.data} /> : null;
}

function renderSwitch(mode: 'buttons' | 'link') {
  routeFetch(apiFetch, [['/settings', { ...SETTINGS, feedback_mode: mode }]]);
  renderWithClient(<Harness />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«بعد انتهاء الحلقة» (settings.feedback_mode)', () => {
  it('shows the mode with its hint; choosing the other PATCHes only feedbackMode and the new hint shows', async () => {
    renderSwitch('buttons');
    const link = await screen.findByRole('radio', { name: s.feedbackModeLink });
    expect(screen.getByRole('radio', { name: s.feedbackModeButtons })).toHaveProperty('checked', true);
    expect(screen.getByText(s.feedbackButtonsHint)).toBeTruthy();
    apiSend.mockResolvedValue({ ...SETTINGS, feedback_mode: 'link' });
    fireEvent.click(link);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { feedbackMode: 'link' }));
    expect(await screen.findByText(s.feedbackLinkOnly)).toBeTruthy();
    expect(screen.getByRole('radio', { name: s.feedbackModeLink })).toHaveProperty('checked', true);
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a failed save says so and keeps the mode', async () => {
    renderSwitch('link');
    apiSend.mockRejectedValue(new Error('down'));
    fireEvent.click(await screen.findByRole('radio', { name: s.feedbackModeButtons }));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(screen.getByText(s.feedbackLinkOnly)).toBeTruthy();
  });
});
