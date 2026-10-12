import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { SETTINGS } from './settings-fixture';
import { SettingsPage } from './SettingsPage';
import { sectionId } from './SettingsNav';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.settings;

function renderPage() {
  routeFetch(apiFetch, [
    ['/settings/integrations', []],
    ['/settings', { ...SETTINGS, join_opens_before_min: 20, academy_whatsapp_e164: '+201001234567' }],
    ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('/admin/settings fields from the registry', () => {
  it('renders the new keys in their sections with their hints', async () => {
    renderPage();
    await screen.findByLabelText(s.joinOpensBeforeMin);
    const classroom = document.getElementById(sectionId('classroom'));
    if (!classroom) throw new Error('no classroom section');
    expect(within(classroom).getByRole('heading').textContent).toBe(s.sections.classroom);
    expect(within(classroom).getByLabelText(s.joinOpensBeforeMin)).toHaveProperty('value', '20');
    expect(within(classroom).getByLabelText(s.joinClosesAfterMin)).toHaveProperty('value', '120');
    expect(within(classroom).getByText(s.hints.joinOpensBeforeMin)).toBeTruthy();
    expect(screen.getByLabelText(s.uploadMaxMb)).toHaveProperty('value', '10');
    expect(screen.getByLabelText(s.academyWhatsapp)).toHaveProperty('value', '+201001234567');
    expect(screen.getByLabelText(s.academyTimezone)).toHaveProperty('value', 'Asia/Riyadh');
    expect(screen.getByLabelText(s.makeupWindowDays)).toHaveProperty('value', '60');
    expect(screen.getByLabelText(s.teachersAlwaysAvailable)).toHaveProperty('checked', true); // owner 2026-10-12
  });

  it('saves a changed join window and WhatsApp number in the one PATCH', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(s.joinOpensBeforeMin), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(s.academyWhatsapp), { target: { value: '+966 50 123 4567' } });
    apiSend.mockResolvedValue(SETTINGS);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        'PATCH',
        '/settings',
        expect.objectContaining({ joinOpensBeforeMin: 30, academyWhatsappE164: '+966501234567', uploadMaxMb: 10 }),
      ),
    );
  });

  it('a bad phone stays on screen with the reason; nothing is sent', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(s.academyWhatsapp), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByText(s.invalidPhone)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
