import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findRow, renderValues } from './values-test-utils';
import { t } from '@/lib/i18n';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/test-utils')).MockLink }));

const c = t.config.custom;
const ENTRY = { key: 'promo.banner', value: 'hi', description: 'نص الترحيب', isPublic: false, updatedAt: '2026-10-05T10:00:00Z', updatedBy: null };
const menuOf = async () => {
  const row = await findRow('نص الترحيب');
  fireEvent.click(within(row).getByRole('button', { name: t.settingsValues.menu.replace('{name}', 'نص الترحيب') }));
  return within(row).getByRole('menu');
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«قيم مخصصة» rows in «القيم»', () => {
  it('«أضف قيمة» in the page head opens the validated form; saving PUTs the key', async () => {
    renderValues(apiFetch, { search: { group: 'custom' } });
    fireEvent.click(await screen.findByRole('button', { name: c.add }));
    const dialog = screen.getByRole('dialog', { name: c.add });
    fireEvent.change(within(dialog).getByLabelText(c.key), { target: { value: 'site.note' } });
    fireEvent.change(within(dialog).getByLabelText(c.value), { target: { value: '"x"' } });
    apiSend.mockResolvedValue({ ...ENTRY, key: 'site.note' });
    fireEvent.click(within(dialog).getByRole('button', { name: c.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/config/custom/site.note', { value: 'x', description: null, isPublic: false }));
    expect(await screen.findByText(c.saved)).toBeTruthy();
  });

  it('the row menu edits with the key fixed', async () => {
    renderValues(apiFetch, { search: { group: 'custom' }, custom: [ENTRY] });
    fireEvent.click(within(await menuOf()).getByRole('menuitem', { name: c.edit }));
    const dialog = screen.getByRole('dialog', { name: c.edit });
    expect((within(dialog).getByLabelText(c.key) as HTMLInputElement).disabled).toBe(true);
  });

  it('delete asks first («نعم، احذفها»), cancel is the default', async () => {
    renderValues(apiFetch, { search: { group: 'custom' }, custom: [ENTRY] });
    fireEvent.click(within(await menuOf()).getByRole('menuitem', { name: c.delete }));
    const dialog = screen.getByRole('dialog', { name: c.delete });
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole('button', { name: c.deleteYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/config/custom/promo.banner'));
  });
});
