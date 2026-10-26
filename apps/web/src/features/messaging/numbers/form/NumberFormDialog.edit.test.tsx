import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { numberView } from '../numbers.fixture';
import { renderPanel } from '../numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const n = t.numbers;

async function openEdit() {
  renderPanel(apiFetch);
  const card = await screen.findByRole('article', { name: 'Notifications line' });
  fireEvent.click(within(card).getByRole('button', { name: n.actions.edit }));
  return screen.getByRole('dialog', { name: n.form.editTitle });
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«تعديل الرقم»', () => {
  it('starts from the record and PATCHes only the changed fields', async () => {
    const dialog = await openEdit();
    expect((within(dialog).getByLabelText(n.fields.label, { exact: false }) as HTMLInputElement).value).toBe('Notifications line');
    fireEvent.change(within(dialog).getByLabelText(n.fields.waba_id), { target: { value: '' } });
    fireEvent.change(within(dialog).getByLabelText(n.fields.provider), { target: { value: 'kapso' } });
    apiSend.mockResolvedValue(numberView());
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/numbers/num-1', { provider: 'kapso', waba_id: null }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('nothing changed: closes without a call', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiSend).not.toHaveBeenCalled();
  });
});
