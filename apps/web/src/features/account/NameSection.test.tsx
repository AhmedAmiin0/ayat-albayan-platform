import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PROFILE, renderWithClient, section } from './account-test-kit';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue(PROFILE);
  apiSend.mockReset();
});

const N = t.account.name;
async function nameSection() {
  renderWithClient(<AccountPage />);
  await screen.findByRole('region', { name: N.title });
  return section(N.title);
}

describe('NameSection (R-ACC-02)', () => {
  it('«حفظ» waits for a change; a saved name says so in a toast and reloads the profile', async () => {
    const s = await nameSection();
    const save = s.getByRole('button', { name: t.account.save });
    expect(save.hasAttribute('disabled')).toBe(true);
    apiSend.mockResolvedValue({ ...PROFILE, full_name: 'سارة محمد' });
    fireEvent.change(s.getByLabelText(N.label), { target: { value: ' سارة محمد ' } });
    fireEvent.click(save);
    expect(await screen.findByText(t.account.toast.name)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/profile', { full_name: 'سارة محمد' });
    expect(apiFetch.mock.calls.filter(([p]) => p === '/me/profile').length).toBeGreaterThan(1);
  });

  it('a one-letter name is refused here, at the field', async () => {
    const s = await nameSection();
    fireEvent.change(s.getByLabelText(N.label), { target: { value: 'س' } });
    fireEvent.click(s.getByRole('button', { name: t.account.save }));
    expect(s.getByText(t.account.errors.name_too_short)).toBeTruthy();
    expect(s.getByLabelText(N.label).getAttribute('aria-invalid')).toBe('true');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('while saving the button says «جاري الحفظ…» and is disabled', async () => {
    const s = await nameSection();
    apiSend.mockReturnValue(new Promise(() => undefined));
    fireEvent.change(s.getByLabelText(N.label), { target: { value: 'سارة محمد' } });
    fireEvent.click(s.getByRole('button', { name: t.account.save }));
    const busy = await s.findByRole('button', { name: t.account.saving });
    expect(busy.hasAttribute('disabled')).toBe(true);
  });
});
