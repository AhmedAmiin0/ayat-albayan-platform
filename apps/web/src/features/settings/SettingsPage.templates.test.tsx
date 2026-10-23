import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { LINES } from '@/features/templates/template-lines-fixture';
import { t } from '@/lib/i18n';
import { CATALOGUE_ROUTE, SETTINGS } from '@/test/settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const heading = () => screen.queryByRole('heading', { name: t.templates.title });
const noneNote = () => screen.queryByText(t.config.search.none);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// The settings search finds «قوالب واتساب» by its title, intro and per-number words (owner 2026-10-18).
describe('settings search — templates', () => {
  it('finds the template section by its words and hides it when nothing of it matches', async () => {
    routeFetch(apiFetch, [
      ['/settings/integrations', []],
      ['/settings', SETTINGS],
      CATALOGUE_ROUTE,
      ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', []],
    ]);
    renderWithClient(<SettingsPage />);
    const box = await screen.findByLabelText(t.config.search.label);
    expect(await screen.findByRole('heading', { name: t.templates.title })).toBeTruthy();
    fireEvent.change(box, { target: { value: t.templates.perNumber.sync } });
    expect(heading()).toBeTruthy();
    expect(screen.getAllByTestId('template-line')).toHaveLength(2);
    expect(noneNote()).toBeNull();
    fireEvent.change(box, { target: { value: t.templates.perNumber.title } });
    expect(heading()).toBeTruthy();
    // The section it found is never under «لا توجد إعدادات تطابق بحثك.»
    expect(noneNote()).toBeNull();
    fireEvent.change(box, { target: { value: t.templates.settings.lines.title } });
    expect(noneNote()).toBeNull();
    fireEvent.change(box, { target: { value: 'zzzz-nothing' } });
    expect(heading()).toBeNull();
    expect(noneNote()).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
