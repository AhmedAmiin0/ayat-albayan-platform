import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PasswordForm } from './PasswordForm';

const signIn = vi.hoisted(() => vi.fn());
const land = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/auth/sign-in', () => ({ signIn }));
vi.mock('@ab/web-kit/auth/use-return-to', () => ({ useLandAfterSignIn: () => land }));

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: t.auth.submit }));

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PasswordForm id="username" label="user" hint="hint">
        <p>links</p>
      </PasswordForm>
    </QueryClientProvider>,
  );
  expect(screen.getByText('links')).toBeTruthy();
}

describe('PasswordForm (docs/30 §5)', () => {
  beforeEach(() => {
    signIn.mockReset();
    land.mockReset().mockResolvedValue(undefined);
  });

  it('blank fields get the field error and never reach the API', async () => {
    renderForm();
    submit();
    expect((await screen.findAllByText(t.common.required)).length).toBe(2);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('a good sign-in lands on the home', async () => {
    signIn.mockResolvedValue({ ok: true, home: '/home' });
    renderForm();
    type('user', 'sara.t');
    type(t.auth.password, 'secret-1');
    submit();
    await waitFor(() => expect(land).toHaveBeenCalledWith('/home'));
    expect(signIn.mock.calls[0]?.[0]).toEqual({ email: 'sara.t', password: 'secret-1' });
  });

  it('a refused sign-in shows its error; a thrown one the generic error', async () => {
    signIn.mockResolvedValueOnce({ ok: false, error: 'wrong' });
    renderForm();
    type('user', 'sara.t');
    type(t.auth.password, 'secret-1');
    submit();
    expect(await screen.findByText('wrong')).toBeTruthy();
    signIn.mockRejectedValueOnce(new Error('net'));
    submit();
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(land).not.toHaveBeenCalled();
  });
});
