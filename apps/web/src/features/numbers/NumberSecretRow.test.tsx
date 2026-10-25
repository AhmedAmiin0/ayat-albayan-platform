import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { numberView } from './numbers.fixture';
import { renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const n = t.numbers;
const field = (card: HTMLElement, name: 'access_token' | 'app_secret') => within(card).getByLabelText(n.fields[name]) as HTMLInputElement;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a number’s secrets (write-only)', () => {
  it('never prefilled; replace PUTs the value, empties the field and says so', async () => {
    const { onSaved } = renderPanel(apiFetch);
    const card = await screen.findByRole('article', { name: 'Notifications line' });
    const token = field(card, 'access_token');
    expect(token.type).toBe('password');
    expect(token.value).toBe('');
    fireEvent.change(token, { target: { value: ' fake-token ' } });
    apiSend.mockResolvedValue(numberView());
    const row = token.closest('div.grid') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: n.secret.replace }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/numbers/num-1/secrets/access_token', { value: 'fake-token' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(n.secret.saved));
    expect(field(card, 'access_token').value).toBe('');
  });

  it('clear is offered only for a saved secret and asks first', async () => {
    renderPanel(apiFetch);
    const card = await screen.findByRole('article', { name: 'Notifications line' });
    const clears = within(card).getAllByRole('button', { name: n.secret.clear });
    expect(clears).toHaveLength(1);
    fireEvent.click(clears[0] as HTMLElement);
    const dialog = screen.getByRole('dialog', { name: `${n.secret.clear}: ${n.fields.access_token}` });
    expect(within(dialog).getByText(n.secret.clearConfirm.replace('{{name}}', n.fields.access_token))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(numberView());
    fireEvent.click(within(dialog).getByRole('button', { name: n.secret.clear }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/admin/numbers/num-1/secrets/access_token'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
