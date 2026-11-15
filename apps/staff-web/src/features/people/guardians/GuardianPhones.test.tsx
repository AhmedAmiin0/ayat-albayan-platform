import { formatPhone } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { GuardianEditDialog } from './GuardianEditForm';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const G = t.guardians;
const MAIN = '+966501234567';
const SECOND = '+966552220000';
const at = '2026-10-29T10:00:00Z';
const GUARDIAN = { id: 'g1', name: 'أم جود', phone_e164: MAIN, country: 'SA', tz: 'Asia/Riyadh', source: null, notes: null };

function open(phones: { phone_e164: string; is_primary: boolean; created_at: string }[]) {
  routeFetch(apiFetch, [['/guardians/g1', { ...GUARDIAN, phones }]]);
  const onDone = vi.fn();
  const client = renderWithClient(<GuardianEditDialog guardianId="g1" onClose={vi.fn()} onDone={onDone} />);
  return { onDone, invalidate: vi.spyOn(client, 'invalidateQueries') };
}

const TWO = [{ phone_e164: MAIN, is_primary: true, created_at: at }, { phone_e164: SECOND, is_primary: false, created_at: at }];

describe('«تعديل ولي الأمر»: the family’s second number (owner 2026-10-29)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('no second number: nothing above the form', async () => {
    open([{ phone_e164: MAIN, is_primary: true, created_at: at }]);
    expect(await screen.findByDisplayValue('أم جود')).toBeTruthy();
    expect(screen.queryByRole('region', { name: G.secondPhone })).toBeNull();
    expect(screen.queryByRole('button', { name: G.removePhone })).toBeNull();
  });

  it('lists the main and the second number; removing asks first, then DELETEs the encoded number', async () => {
    apiSend.mockResolvedValue(undefined);
    const { onDone, invalidate } = open(TWO);
    const region = within(await screen.findByRole('region', { name: G.secondPhone }));
    expect(region.getByText(G.mainPhone)).toBeTruthy();
    expect(region.getByText(formatPhone(MAIN))).toBeTruthy();
    expect(region.getByText(formatPhone(SECOND))).toBeTruthy();
    fireEvent.click(region.getByRole('button', { name: G.removePhone }));
    const confirm = within(region.getByRole('group', { name: G.removePhone }));
    const sentence = G.removePhoneConfirm.replace('{phone}', formatPhone(SECOND));
    expect(confirm.getByText((_, el) => el?.tagName === 'P' && el.textContent === sentence)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(confirm.getByRole('button', { name: G.removePhone }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(G.phoneRemoved));
    expect(apiSend).toHaveBeenCalledWith('DELETE', '/guardians/g1/phones/%2B966552220000');
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([['guardians'], ['students'], ['threads']]);
  });

  it('«إلغاء» keeps it; a 404 says it is not this family’s second number', async () => {
    apiSend.mockRejectedValue(new ApiError(404, { code: 'phone_not_found', message: 'phone_not_found' }));
    const { onDone } = open(TWO);
    const region = within(await screen.findByRole('region', { name: G.secondPhone }));
    fireEvent.click(region.getByRole('button', { name: G.removePhone }));
    fireEvent.click(region.getByRole('button', { name: t.common.cancel }));
    expect(region.queryByRole('group', { name: G.removePhone })).toBeNull();
    fireEvent.click(region.getByRole('button', { name: G.removePhone }));
    fireEvent.click(within(region.getByRole('group', { name: G.removePhone })).getByRole('button', { name: G.removePhone }));
    expect(await region.findByText(G.phoneNotFound)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
