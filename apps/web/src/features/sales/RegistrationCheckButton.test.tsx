import type { RegistrationCheckView } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { RegistrationCheckButton } from './RegistrationCheckButton';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

const R = t.registrationCheck;
const FOUND: RegistrationCheckView = {
  found: true,
  more: true,
  matches: [
    { name: 'سهيلة أحمد', code: 'AB-0183', status: 'pending_renewal', teacher_name: 'أ. أبرار' },
    { name: 'يوسف أحمد', code: 'AB-0184', status: 'trial', teacher_name: null },
  ],
};

function openDialog(phone?: string) {
  renderWithClient(<RegistrationCheckButton phone={phone} />);
  fireEvent.click(screen.getByRole('button', { name: R.action }));
  return within(screen.getByRole('dialog', { name: R.title }));
}

describe('«التحقق من التسجيل»', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    granted.clear();
    granted.add('students.check_registration');
  });

  it('is hidden without students.check_registration', () => {
    granted.clear();
    renderWithClient(<RegistrationCheckButton phone="+966501234567" />);
    expect(screen.queryByRole('button', { name: R.action })).toBeNull();
  });

  it('checks the chat number on open and lists the children', async () => {
    apiFetch.mockResolvedValue(FOUND);
    const dialog = openDialog('+966501234567');
    expect(await dialog.findByText(R.found.replace('{n}', '2'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/registration-check?phone=%2B966501234567');
    expect(dialog.getByText('AB-0183')).toBeTruthy();
    expect(dialog.getByText(new RegExp(t.enums.studentStatus.pending_renewal))).toBeTruthy();
    expect(dialog.getByText(R.noTeacher)).toBeTruthy();
    expect(dialog.getByText(R.more)).toBeTruthy();
  });

  it('by name: not found', async () => {
    apiFetch.mockResolvedValue({ found: false, matches: [], more: false });
    const dialog = openDialog();
    fireEvent.change(dialog.getByLabelText(R.query), { target: { value: 'مريم' } });
    fireEvent.click(screen.getByRole('button', { name: R.submit }));
    expect(await dialog.findByText(R.notFoundName)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/sales/registration-check?q=${encodeURIComponent('مريم')}`);
  });

  it('a too-short name is refused without a request; the phone tab is a toggle', async () => {
    const dialog = openDialog();
    fireEvent.change(dialog.getByLabelText(R.query), { target: { value: 'مر' } });
    fireEvent.click(screen.getByRole('button', { name: R.submit }));
    expect(await dialog.findByText(R.error.query_too_short)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: R.byPhone }));
    fireEvent.change(dialog.getByLabelText(R.phone), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: R.submit }));
    expect(await dialog.findByText(R.error.invalid_phone)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a phone with nobody registered, then a server refusal', async () => {
    apiFetch.mockResolvedValueOnce({ found: false, matches: [], more: false });
    const dialog = openDialog('+966501234567');
    expect(await dialog.findByText(R.notFoundPhone)).toBeTruthy();
    apiFetch.mockRejectedValueOnce(new ApiError(403, { code: 'forbidden' }));
    fireEvent.change(dialog.getByLabelText(R.phone), { target: { value: '+966501234568' } });
    fireEvent.click(screen.getByRole('button', { name: R.submit }));
    await waitFor(() => expect(dialog.getByText(R.error.generic)).toBeTruthy());
  });
});
