import { formatPhone } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const n = t.numbers;
const card = (label: string) => screen.findByRole('article', { name: label });

afterEach(() => apiFetch.mockReset());

describe('«الأرقام» cards (numbers.manage)', () => {
  it('each number shows its name, role, provider, LTR phone, chips, last check and secret states', async () => {
    renderPanel(apiFetch);
    expect(screen.getByRole('heading', { name: n.title, level: 2 })).toBeTruthy();
    const first = await card('Notifications line');
    expect(within(first).getByText(n.purpose.notifications)).toBeTruthy();
    expect(within(first).getByText(`· ${n.provider.meta}`)).toBeTruthy();
    expect(within(first).getByText(formatPhone('+15550001111')).closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(within(first).getByText(n.chips.enabled)).toBeTruthy();
    expect(within(first).getByText(n.chips.default)).toBeTruthy();
    expect(within(first).getByText(n.health.ok)).toBeTruthy();
    expect(within(first).getAllByText(n.secret.set, { exact: false })).toHaveLength(2);
    expect(within(first).getByText(n.secret.notSet)).toBeTruthy();
    expect(within(first).getByText(n.technical)).toBeTruthy();
    expect(within(first).getByText('1000000001')).toBeTruthy();
    const spare = await card('Spare line');
    expect(within(spare).getByText(n.chips.disabled)).toBeTruthy();
    expect(within(spare).getByText(n.chips.notChecked)).toBeTruthy();
  });

  it('delete is offered only on a disabled number; default buttons follow the state', async () => {
    renderPanel(apiFetch);
    const first = await card('Notifications line');
    const spare = await card('Spare line');
    expect(within(first).queryByRole('button', { name: n.actions.delete })).toBeNull();
    expect(within(first).getByRole('button', { name: n.actions.unsetDefault })).toBeTruthy();
    expect(within(spare).getByRole('button', { name: n.actions.delete })).toBeTruthy();
    expect(within(spare).getByRole('button', { name: n.actions.enable })).toBeTruthy();
    expect(within(spare).queryByRole('button', { name: n.actions.makeDefault })).toBeNull();
    expect(screen.getByRole('button', { name: n.actions.add })).toBeTruthy();
    expect(screen.queryByText(n.readOnly)).toBeNull();
  });

  it('no numbers yet says so', async () => {
    renderPanel(apiFetch, { numbers: [] });
    expect(await screen.findByText(n.empty)).toBeTruthy();
  });
});
