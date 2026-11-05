import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ALL, renderActions, VIEW } from './people-edit.test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const E = t.peopleEdit;

describe('the UI never offers what the API refuses (review b #3, #4, #5)', () => {
  it('a student with history: «تحويل إلى ولي أمر» is off and says why', async () => {
    renderActions(apiFetch, {
      permissions: ALL,
      view: { ...VIEW, student: { ...VIEW.student, has_records: true } },
    });
    fireEvent.click(await screen.findByRole('button', { name: E.convert }));
    const button = await screen.findByRole<HTMLButtonElement>('button', { name: E.toGuardian });
    expect(button.disabled).toBe(true);
    expect(screen.getByText(E.toGuardianRecords)).toBeTruthy();
  });

  it('a student with a login cannot be moved: the confirm stays off', async () => {
    renderActions(apiFetch, {
      permissions: ALL,
      view: { ...VIEW, student: { ...VIEW.student, has_login: true } },
    });
    fireEvent.click(await screen.findByRole('button', { name: E.attach }));
    expect(await screen.findByText(E.moveLogin)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: E.confirm }).disabled).toBe(true);
  });

  it('after «تحويل إلى ولي أمر» the page is told the student row is gone', async () => {
    apiSend.mockResolvedValue({ guardian_id: 'g1' });
    const onRemoved = vi.fn();
    renderActions(apiFetch, { permissions: ALL, onRemoved });
    fireEvent.click(await screen.findByRole('button', { name: E.convert }));
    fireEvent.click(await screen.findByRole('button', { name: E.toGuardian }));
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    const notice = E.toGuardianDone.replace('{name}', 'سهيلة');
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith(notice));
    expect(apiSend).toHaveBeenCalledWith('POST', '/people/students/s1/to-guardian', undefined);
  });
});
