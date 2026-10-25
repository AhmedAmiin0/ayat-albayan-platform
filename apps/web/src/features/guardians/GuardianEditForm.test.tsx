import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { GuardianEditDialog } from './GuardianEditForm';
import { guardianPatch } from './guardian-form';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const GUARDIAN = { id: 'g1', name: 'أم جود', phone_e164: '+966501234567', country: 'SA', tz: 'Asia/Riyadh', source: null, notes: null };

function open() {
  routeFetch(apiFetch, [['/guardians/g1', GUARDIAN]]);
  const onDone = vi.fn();
  renderWithClient(<GuardianEditDialog guardianId="g1" onClose={vi.fn()} onDone={onDone} />);
  return onDone;
}

describe('«تعديل ولي الأمر» (research-forms item 10)', () => {
  it('guardianPatch: phone to E.164, blanks to null, required name and phone', () => {
    const v = { name: ' منى ', phone: '0501234567', country: '', source: 'referral', notes: ' ' } as const;
    expect(guardianPatch(v)).toEqual({
      ok: true,
      patch: { name: 'منى', phone_e164: '+966501234567', country: null, source: 'referral', notes: null },
    });
    expect(guardianPatch({ ...v, name: '', phone: '12' })).toEqual({
      ok: false,
      errors: { name: t.common.required, phone: t.common.phoneErrors.missing_country_code },
    });
  });

  it('edits the guardian with the form wording and PATCHes it', async () => {
    apiSend.mockResolvedValue(GUARDIAN);
    const onDone = open();
    expect(await screen.findByDisplayValue('أم جود')).toBeTruthy();
    expect(screen.getByText(t.guardians.phoneHint)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.guardians.source), { target: { value: 'instagram_ad' } });
    fireEvent.change(screen.getByLabelText(t.guardians.notes), { target: { value: 'بتفضّل المسا' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.guardians.updated));
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/guardians/g1', expect.objectContaining({ source: 'instagram_ad', notes: 'بتفضّل المسا' }));
  });

  it('a phone that belongs to another guardian (409) says so', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { message: 'phone_taken' }));
    open();
    await screen.findByDisplayValue('أم جود');
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByText(t.guardians.phoneTaken)).toBeTruthy();
  });
});
