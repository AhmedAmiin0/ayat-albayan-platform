import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findRow, renderValues } from './values-test-utils';
import { t } from '@/lib/i18n/i18n';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const c = t.config.custom;
const p = t.settingsValues.customPublic;
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
    fireEvent.click(within(await menuOf()).getByRole('menuitem', { name: t.settingsValues.customDelete }));
    const dialog = screen.getByRole('dialog', { name: c.delete });
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole('button', { name: c.deleteYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/config/custom/promo.banner'));
  });

  it('an edit that makes a private value public asks first; yes saves it', async () => {
    renderValues(apiFetch, { search: { group: 'custom' }, custom: [ENTRY] });
    fireEvent.click(within(await menuOf()).getByRole('menuitem', { name: c.edit }));
    const form = screen.getByRole('dialog', { name: c.edit });
    fireEvent.click(within(form).getByLabelText(c.isPublic));
    fireEvent.click(within(form).getByRole('button', { name: c.save }));
    const ask = screen.getByRole('dialog', { name: p.title });
    expect(ask.textContent).toContain(p.body);
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ ...ENTRY, isPublic: true });
    fireEvent.click(within(ask).getByRole('button', { name: p.yes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/config/custom/promo.banner', expect.objectContaining({ isPublic: true })));
  });

  it('an empty «قيم مخصصة» says so instead of a header-only table; a failed list offers a retry', async () => {
    renderValues(apiFetch, { search: { group: 'custom' } });
    expect(await screen.findByText(t.settingsValues.groupEmpty)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('a failed custom list shows the load error with «أعد المحاولة», not an empty list', async () => {
    renderValues(apiFetch, { search: { group: 'custom' }, customState: 'error' });
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert.textContent).toContain(c.loadError);
    expect(within(alert).getByRole('button', { name: t.settingsValues.retry })).toBeTruthy();
    expect(screen.queryByText(t.settingsValues.groupEmpty)).toBeNull();
  });
});
