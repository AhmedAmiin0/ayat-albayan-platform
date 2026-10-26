import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { numberView } from '../numbers.fixture';
import { fetchCount, renderPanel } from '../numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const n = t.numbers;

async function openAdd() {
  renderPanel(apiFetch);
  await screen.findByRole('article', { name: 'Notifications line' });
  fireEvent.click(screen.getByRole('button', { name: n.actions.add }));
  return screen.getByRole('dialog', { name: n.form.addTitle });
}
const type = (dialog: HTMLElement, label: string, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(label, { exact: false }), { target: { value } });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«إضافة رقم»', () => {
  it('flags bad fields under each field and sends nothing', async () => {
    const dialog = await openAdd();
    type(dialog, n.fields.phone_number_id, 'not an id!');
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    expect(await within(dialog).findByText(n.form.invalid)).toBeTruthy();
    expect(within(dialog).getByText(t.common.required)).toBeTruthy();
    expect(within(dialog).getByText(n.form.invalidId)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a valid number is POSTed disabled, then the list and the parity refetch', async () => {
    const dialog = await openAdd();
    type(dialog, n.fields.label, ' Backup ');
    fireEvent.change(within(dialog).getByLabelText(n.fields.purpose), { target: { value: 'chat' } });
    type(dialog, n.fields.phone_number_id, '1000000005');
    apiSend.mockResolvedValue(numberView({ id: 'num-5' }));
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/admin/numbers', {
        label: 'Backup', purpose: 'chat', provider: 'meta', phone_number_id: '1000000005', waba_id: null, app_id: null, enabled: false,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchCount(apiFetch, '/admin/numbers')).toBe(2);
    expect(fetchCount(apiFetch, '/admin/communications/parity')).toBe(2);
  });

  it('a 409 phone_taken is shown in words, on the phone id field too', async () => {
    const dialog = await openAdd();
    type(dialog, n.fields.label, 'Backup');
    type(dialog, n.fields.phone_number_id, '1000000001');
    apiSend.mockRejectedValue(new ApiError(409, { message: 'phone_taken' }));
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    await waitFor(() => expect(within(dialog).getAllByText(n.errors.phone_taken)).toHaveLength(2));
  });
});
