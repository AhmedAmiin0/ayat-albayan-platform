import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { numberView } from './numbers.fixture';
import { renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const can = vi.hoisted(() => ({ manage: true }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => p !== 'numbers.manage' || can.manage }),
}));

// «ترتيب البديل» (docs/23c decision 9): 0–999, saved through the number PATCH (numbers.manage).

const r = t.numbers.fallbackRank;
const card = async () => within(await screen.findByRole('article', { name: 'Notifications line' }));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  can.manage = true;
});

describe('«ترتيب البديل»', () => {
  it('refuses a value outside 0–999 in words and sends nothing', async () => {
    const { onSaved } = renderPanel(apiFetch);
    const c = await card();
    const input = c.getByRole('spinbutton', { name: r.label });
    expect((input as HTMLInputElement).value).toBe('100');
    fireEvent.change(input, { target: { value: '1000' } });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(c.getByRole('alert').textContent).toContain(r.invalid);
    fireEvent.click(c.getByRole('button', { name: r.save }));
    expect(apiSend).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('a valid value PATCHes fallback_rank only, then the toast', async () => {
    const { onSaved } = renderPanel(apiFetch);
    const c = await card();
    expect(c.queryByRole('button', { name: r.save })).toBeNull();
    apiSend.mockResolvedValue(numberView({ fallback_rank: 7 }));
    fireEvent.change(c.getByRole('spinbutton', { name: r.label }), { target: { value: '7' } });
    fireEvent.click(c.getByRole('button', { name: r.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/numbers/num-1', { fallback_rank: 7 }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(r.saved));
  });

  it('without numbers.manage the rank is text', async () => {
    can.manage = false;
    renderPanel(apiFetch);
    const c = await card();
    expect(c.queryByRole('spinbutton')).toBeNull();
    expect(c.getByText(r.value.replace('{{rank}}', '100'))).toBeTruthy();
  });
});
