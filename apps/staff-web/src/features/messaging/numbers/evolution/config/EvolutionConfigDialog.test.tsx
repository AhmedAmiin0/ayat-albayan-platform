import { evolutionConfigSchema, type NumberEvolutionView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { evolutionPart, evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { syncView } from '@/features/messaging/numbers/evolution/sync/sync.fixture';
import { EvolutionConfigDialog } from './EvolutionConfigDialog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const e = t.numbers.evolution;
const c = e.config;
const CONFIG_PATH = '/admin/numbers/num-7/evolution/config';

function open(evolution: NumberEvolutionView = evolutionPart()) {
  const view = evolutionView({ evolution });
  renderWithClient(<EvolutionConfigDialog view={view} evolution={evolution} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: c.title });
}

const field = (dialog: HTMLElement, label: string) =>
  within(dialog).getByLabelText<HTMLInputElement>(label, { exact: false });

afterEach(() => apiFetch.mockReset());

describe('«إعدادات Evolution»', () => {
  it('shows every section with the defaults; no Cloud section on Baileys', () => {
    const dialog = open();
    expect(field(dialog, c.limits.gap_ms).value).toBe('3000');
    expect(field(dialog, c.limits.daily_cap).value).toBe('60');
    expect(field(dialog, c.behaviour.groups_ignore).checked).toBe(true);
    expect(field(dialog, 'MESSAGES_UPSERT').checked).toBe(true);
    expect(field(dialog, 'CHATS_SET').checked).toBe(false);
    expect(field(dialog, c.webhook.url).value).toBe('http://ayat-lb:8080/webhooks/evolution/academy-staff');
    expect(field(dialog, c.webhook.url).readOnly).toBe(true);
    expect(within(dialog).getByLabelText(t.numbers.fields.evolution_proxy_password)).toBeTruthy();
    expect(within(dialog).queryByText(c.sections.cloud)).toBeNull();
  });

  it('no typing delay and no «always online» field (owner 2026-11-06)', () => {
    const dialog = open();
    const sending = within(dialog).getByRole('group', { name: c.sections.sending });
    expect(within(sending).queryByRole('textbox')).toBeNull();
    expect(within(sending).getAllByRole('checkbox')).toHaveLength(1);
    const behaviour = within(dialog).getByRole('group', { name: c.sections.behaviour });
    expect(within(behaviour).getAllByRole('checkbox')).toHaveLength(5);
    expect(within(dialog).queryByText(/يكتب|متصلًا دائمًا/)).toBeNull();
  });

  it('Cloud: the Meta ids and the access token row; empty ids are refused before any call', () => {
    const dialog = open(evolutionPart({ mode: 'cloud' }));
    fireEvent.click(within(dialog).getByRole('button', { name: c.save }));
    expect(within(dialog).getAllByText(c.errors.cloud_needed)).toHaveLength(2);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(within(dialog).getByText(c.sections.cloud)).toBeTruthy();
    expect(field(dialog, c.cloud.phone_number_id)).toBeTruthy();
    expect(within(dialog).getByLabelText(t.numbers.fields.evolution_cloud_token)).toBeTruthy();
  });

  it('saves with PUT …/evolution/config and shows the answer read back', async () => {
    const dialog = open();
    fireEvent.change(field(dialog, c.limits.gap_ms), { target: { value: '5000' } });
    apiFetch.mockResolvedValue(syncView({ synced: true }));
    fireEvent.click(within(dialog).getByRole('button', { name: c.save }));
    const config = evolutionConfigSchema.parse({ limits: { gap_ms: 5000 } });
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(CONFIG_PATH, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }),
    );
    expect(await within(dialog).findByText(e.sync.synced)).toBeTruthy();
  });

  it('a proxy turned on without host and port is refused before any call', () => {
    const dialog = open();
    fireEvent.click(field(dialog, c.proxy.enabled));
    fireEvent.click(within(dialog).getByRole('button', { name: c.save }));
    expect(within(dialog).getByText(c.invalid)).toBeTruthy();
    expect(within(dialog).getByText(c.errors.proxy_needed)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('no public origin configured: the URL says so; turning events off explains the cost', () => {
    const dialog = open(evolutionPart({ hook_url: null }));
    expect(within(dialog).getByText(c.webhook.urlNone)).toBeTruthy();
    fireEvent.click(field(dialog, c.webhook.enabled));
    expect(within(dialog).getByText(c.webhook.offHint)).toBeTruthy();
  });

  it('a refusal from Evolution is said in words (502 evolution_unreachable)', async () => {
    const dialog = open();
    apiFetch.mockRejectedValue(new ApiError(502, { code: 'evolution_unreachable', saved: true }));
    fireEvent.click(within(dialog).getByRole('button', { name: c.save }));
    const words = `${e.errors.savedNotPushed} ${e.errors.evolution_unreachable}`;
    expect(await within(dialog).findByText(words)).toBeTruthy();
  });
});
