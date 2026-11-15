import { ApiError } from '@ab/client-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ResetFlow } from './ResetFlow';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiFetch: vi.fn(), apiSend }));

const F = t.familyAuth;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function toCodeStep(label: string, identifier: string) {
  type(label, identifier);
  click(F.sendCode);
  await screen.findByRole('status');
  fireEvent.paste(screen.getByLabelText(F.codeDigit.replace('{n}', '1')), { clipboardData: { getData: () => '٦٥٤٣٢١' } });
}

describe('ResetFlow (docs/30 §6)', () => {
  beforeEach(() => apiSend.mockReset().mockResolvedValue(undefined));

  it('«نسيت»: identifier → code → new password twice → saved', async () => {
    const onDone = vi.fn();
    render(<ResetFlow mode="forgot" onDone={onDone} />);
    expect(screen.getByRole('heading', { name: F.forgotTitle })).toBeTruthy();
    expect(screen.getByText(F.forgotIntro)).toBeTruthy();
    await toCodeStep(F.identifier, ' sara.t ');
    expect(apiSend).toHaveBeenCalledWith('POST', '/auth/password/forgot', { identifier: 'sara.t' });
    type(F.newPassword, 'new-secret-1');
    type(F.confirmPassword, 'new-secret-1');
    click(F.savePassword);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/auth/password/reset', {
      identifier: 'sara.t',
      code: '654321',
      password: 'new-secret-1',
    });
  });

  it('different passwords or a short one are caught before the API', async () => {
    render(<ResetFlow mode="forgot" onDone={vi.fn()} />);
    await toCodeStep(F.identifier, 'AB-1234');
    type(F.newPassword, 'new-secret-1');
    type(F.confirmPassword, 'new-secret-2');
    click(F.savePassword);
    expect((await screen.findByRole('alert')).textContent).toBe(F.passwordsDiffer);
    type(F.newPassword, 'short');
    click(F.savePassword);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(t.users.validation.passwordShort.replace('{n}', '8')));
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a wrong code shows the API error and stays on the code step', async () => {
    render(<ResetFlow mode="forgot" onDone={vi.fn()} />);
    await toCodeStep(F.identifier, 'AB-1234');
    apiSend.mockRejectedValueOnce(new ApiError(401, { code: 'invalid_code' }));
    type(F.newPassword, 'new-secret-1');
    type(F.confirmPassword, 'new-secret-1');
    click(F.savePassword);
    expect((await screen.findByRole('alert')).textContent).toBe(F.errors.invalid_code);
    expect(screen.getByRole('button', { name: F.savePassword })).toBeTruthy();
  });

  it('«أول دخول؟»: the student code with its own intro; «العودة» gives up', () => {
    const onDone = vi.fn();
    render(<ResetFlow mode="firstTime" onDone={onDone} />);
    expect(screen.getByText(F.firstTimeIntro)).toBeTruthy();
    expect(screen.getByLabelText(F.username)).toBeTruthy();
    expect(screen.getByText(F.studentUsernameHint)).toBeTruthy();
    click(F.backToLogin);
    expect(onDone).toHaveBeenCalledWith(false);
  });
});
