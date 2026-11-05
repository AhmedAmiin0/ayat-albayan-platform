import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { ALL, renderActions } from '@/features/people/students/people-edit/people-edit.test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const E = t.peopleEdit;
const OTHER = {
  id: 'g2',
  name: 'أبو خالد',
  phone_e164: '+201000000009',
  students: [{ code: 'AB-0190', name: 'خالد' }],
};

async function open() {
  renderActions(apiFetch, { permissions: ALL, extra: [['/people/guardians?search=', [OTHER]]] });
  fireEvent.click(await screen.findByRole('button', { name: E.attach }));
  return screen
    .findByRole('searchbox', { name: E.search })
    .catch(() => screen.getByLabelText(E.search));
}

describe('«ربط بولي أمر آخر»', () => {
  it('searches, picks a family, confirms and moves the student only', async () => {
    apiSend.mockResolvedValue({ guardian_id: 'g2' });
    fireEvent.change(await open(), { target: { value: 'AB-0190' } });
    fireEvent.click(await screen.findByRole('radio', { name: 'أبو خالد' }));
    expect(screen.getByRole('status').textContent).toContain('أبو خالد');
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/people/students/s1/guardian', {
        guardian_id: 'g2',
      }),
    );
    expect(await screen.findByText(E.moved)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/people/guardians?search=AB-0190');
  });

  it('a new guardian by number: parsed to E.164 before it is offered', async () => {
    apiSend.mockResolvedValue({ guardian_id: 'g3' });
    await open();
    const fields = screen.getAllByLabelText(E.fields.name);
    fireEvent.change(fields[fields.length - 1] as HTMLElement, { target: { value: 'أبو سهيلة' } });
    fireEvent.change(screen.getByLabelText(E.fields.phone), {
      target: { value: '+20 100 000 0003' },
    });
    fireEvent.click(screen.getByRole('button', { name: E.newFamily }));
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/people/students/s1/guardian', {
        guardian: { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' },
      }),
    );
  });

  it('nothing to confirm before a pick; a refusal (same family) reads in MSA', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'guardian_changed' }));
    fireEvent.change(await open(), { target: { value: 'أبو' } });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: E.confirm }).disabled).toBe(true);
    fireEvent.click(await screen.findByRole('radio', { name: 'أبو خالد' }));
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    expect(await screen.findByText(E.errors.guardian_changed)).toBeTruthy();
  });
});
