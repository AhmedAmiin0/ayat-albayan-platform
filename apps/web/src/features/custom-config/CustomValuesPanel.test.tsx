import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { CustomValuesPanel } from './CustomValuesPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const c = t.config.custom;
const ENTRY = { key: 'promo', value: { text: 'hi' }, description: 'شعار', isPublic: true, updatedAt: '2026-10-05T10:00:00Z', updatedBy: null };

function renderPanel(rows: unknown[] = [ENTRY], query = '') {
  routeFetch(apiFetch, [['/config/custom', rows]]);
  const onSaved = vi.fn();
  renderWithClient(<CustomValuesPanel query={query} onSaved={onSaved} />);
  return onSaved;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«قيم مخصصة» panel', () => {
  it('lists entries with their key, visibility and description; an empty list says so', async () => {
    renderPanel();
    expect(await screen.findByText('promo')).toBeTruthy();
    expect(screen.getByText(c.public)).toBeTruthy();
    expect(screen.getByText('شعار')).toBeTruthy();
    renderPanel([]);
    expect(await screen.findByText(c.empty)).toBeTruthy();
  });

  it('adds an entry: validates first, then PUTs the key and body', async () => {
    const onSaved = renderPanel([]);
    fireEvent.click(await screen.findByRole('button', { name: c.add }));
    fireEvent.change(screen.getByLabelText(c.key), { target: { value: 'Bad Key' } });
    fireEvent.change(screen.getByLabelText(c.value), { target: { value: '{"a":1}' } });
    fireEvent.click(screen.getByRole('button', { name: c.save }));
    expect(await screen.findByText(c.invalidKey)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(c.key), { target: { value: 'site.banner' } });
    fireEvent.click(screen.getByLabelText(c.isPublic));
    apiSend.mockResolvedValue({ ...ENTRY, key: 'site.banner' });
    fireEvent.click(screen.getByRole('button', { name: c.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/config/custom/site.banner', { value: { a: 1 }, description: null, isPublic: true }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(c.saved));
  });

  it('edits an entry with its key fixed', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: c.edit }));
    expect((screen.getByLabelText(c.key) as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(c.value), { target: { value: '"x"' } });
    apiSend.mockResolvedValue(ENTRY);
    fireEvent.click(screen.getByRole('button', { name: c.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/config/custom/promo', { value: 'x', description: 'شعار', isPublic: true }));
  });

  it('delete asks first, with cancel as the default; yes deletes', async () => {
    const onSaved = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: c.delete }));
    const dialog = screen.getByRole('dialog', { name: c.delete });
    expect(within(dialog).getByText(c.deleteConfirm.replace('{key}', 'promo'))).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByRole('button', { name: c.deleteYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/config/custom/promo'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(c.deleted));
  });

  it('hides itself when a search matches none of its entries', async () => {
    renderPanel([ENTRY], 'zzz');
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(screen.queryByText(c.add)).toBeNull();
  });
});
