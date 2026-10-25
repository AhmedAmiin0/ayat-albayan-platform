import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { importResult } from './numbers.fixture';
import { fetchCount, renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const im = t.numbers.import;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«استيراد الإعداد الحالي»: dry run, then confirm', () => {
  it('previews each role with field labels and sources, secrets hidden; confirm applies and refetches', async () => {
    const { onSaved } = renderPanel(apiFetch);
    await screen.findByRole('article', { name: 'Notifications line' });
    apiSend.mockResolvedValueOnce(importResult());
    fireEvent.click(screen.getByRole('button', { name: im.title }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/numbers/import', { dryRun: true }));
    const dialog = await screen.findByRole('dialog', { name: im.preview });
    const role = within(dialog).getByRole('region', { name: t.numbers.purpose.notifications });
    expect(within(role).getByText(im.action.create)).toBeTruthy();
    expect(within(role).getByText(`${t.numbers.fields.phone_number_id}:`)).toBeTruthy();
    expect(within(role).getByText('1000000003')).toBeTruthy();
    expect(within(role).getByText(`(${im.source.env})`)).toBeTruthy();
    expect(within(role).getAllByText(`(${im.source.db})`)).toHaveLength(2);
    expect(within(role).getByText(im.secretHidden)).toBeTruthy();
    expect(within(dialog).getByText(im.action.unconfigured)).toBeTruthy();
    expect(within(dialog).queryByText(im.nothing)).toBeNull();
    apiSend.mockResolvedValueOnce(importResult({ dry_run: false }));
    fireEvent.click(within(dialog).getByRole('button', { name: im.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('POST', '/admin/numbers/import', { dryRun: false }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaved).toHaveBeenCalledWith(im.done);
    expect(fetchCount(apiFetch, '/admin/numbers')).toBe(2);
    expect(fetchCount(apiFetch, '/admin/communications/parity')).toBe(2);
  });
});
