import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { RegistrationCheckButton } from '@/features/sales/sales/registration/RegistrationCheckButton/RegistrationCheckButton';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

describe('registration check, English', () => {
  it('reads in English', async () => {
    apiFetch.mockResolvedValue({ found: true, more: false, matches: [{ name: 'Suhaila', code: 'AB-0183', status: 'pending_renewal', teacher_name: null }] });
    renderWithClient(<RegistrationCheckButton phone="+966501234567" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check registration' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Registration check' }));
    expect(await dialog.findByText('Registered: 1 student(s)')).toBeTruthy();
    expect(dialog.getByText(new RegExp(en.enums.studentStatus.pending_renewal))).toBeTruthy();
    expect(dialog.getByText('No teacher yet')).toBeTruthy();
    expect(dialog.getByRole('button', { name: 'By name or code' })).toBeTruthy();
  });
});
