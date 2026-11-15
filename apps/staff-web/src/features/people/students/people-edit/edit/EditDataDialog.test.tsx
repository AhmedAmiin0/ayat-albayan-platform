import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ALL, renderActions } from '@/features/people/students/people-edit/people-edit.test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const E = t.peopleEdit;
const F = E.fields;

async function open() {
  renderActions(apiFetch, { permissions: ALL });
  fireEvent.click(await screen.findByRole('button', { name: E.editData }));
  await screen.findByDisplayValue('أم سهيلة');
}
const inputs = (label: string) => screen.getAllByLabelText(label);

describe('«تعديل البيانات»', () => {
  it('sends only the changed fields of each part, then shows the notice', async () => {
    apiSend.mockResolvedValue({ id: 'x' });
    await open();
    fireEvent.change(inputs(F.name)[0] as HTMLElement, { target: { value: 'سهيلة أحمد' } });
    fireEvent.change(screen.getByLabelText(F.age), { target: { value: '13' } });
    fireEvent.change(screen.getByLabelText(F.country), { target: { value: 'SA' } });
    fireEvent.click(screen.getByRole('button', { name: E.save }));
    expect(await screen.findByText(E.saved)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/people/students/s1', {
      name: 'سهيلة أحمد',
      age: 13,
    });
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/people/guardians/g1', { country: 'SA' });
  });

  it('never offers the admin-only fields (status, program, teacher, link, source)', async () => {
    await open();
    for (const label of [t.enums.program.quran, t.guardians.source])
      expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByText(t.enums.studentStatus.active)).toBeNull();
  });

  it('a bad phone is marked and nothing is sent; a refusal reads in MSA', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(F.phone), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: E.save }));
    expect(await screen.findAllByText(E.invalid)).not.toHaveLength(0);
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'phone_taken' }));
    fireEvent.change(screen.getByLabelText(F.phone), { target: { value: '+201000000005' } });
    fireEvent.click(screen.getByRole('button', { name: E.save }));
    expect(await screen.findByText(E.errors.phone_taken)).toBeTruthy();
  });

  it('removes the second number after a confirm', async () => {
    apiSend.mockResolvedValue(undefined);
    await open();
    fireEvent.click(screen.getByRole('button', { name: E.removeSecond }));
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('DELETE', '/people/guardians/g1/phones/%2B201000000002'),
    );
  });
});
