import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { TestFlagSwitch } from './TestFlagSwitch';

const { apiSend } = vi.hoisted(() => ({ apiSend: vi.fn() }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const ID = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';
const T = t.testAccounts;
const renderUi = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};
const toggle = () => fireEvent.click(screen.getByRole('switch'));

beforeEach(() => apiSend.mockReset());

describe('TestFlagSwitch (docs/56)', () => {
  it('asks first: nothing is sent until «تأكيد»; «إلغاء» puts the switch back', () => {
    renderUi(<TestFlagSwitch target="user" row={{ id: ID, is_test: false }} />);
    expect(screen.getByText(T.userSwitch)).toBeTruthy();
    toggle();
    expect(screen.getByText(T.confirmOn)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: T.cancel }));
    expect(screen.getByRole<HTMLInputElement>('switch').checked).toBe(false);
  });

  it('a student switched on: PATCH /students/:id/test {is_test: true}', async () => {
    apiSend.mockResolvedValue({ id: ID, is_test: true });
    renderUi(<TestFlagSwitch target="student" row={{ id: ID, is_test: false }} />);
    toggle();
    fireEvent.click(screen.getByRole('button', { name: T.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', `/students/${ID}/test`, { is_test: true }));
  });

  it('switched off asks with the other text and sends is_test false', async () => {
    apiSend.mockResolvedValue({ id: ID, is_test: false });
    renderUi(<TestFlagSwitch target="user" row={{ id: ID, is_test: true }} />);
    toggle();
    expect(screen.getByText(T.confirmOff)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: T.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', `/admin/users/${ID}/test`, { is_test: false }));
  });
});
