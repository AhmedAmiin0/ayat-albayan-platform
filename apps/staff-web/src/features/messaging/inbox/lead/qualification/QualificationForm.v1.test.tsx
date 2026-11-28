import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { lead } from '@/features/messaging/inbox/testing/inbox-fixture';
import { QualificationForm } from './QualificationForm';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
afterEach(() => mockApi.reset('write'));

describe("«بيانات الطالب»: the first registration form's questions (research-forms 8–9)", () => {
  it("asks them with the form's wording, in its order, and saves them", async () => {
    renderWithClient(<QualificationForm lead={lead()} onDone={vi.fn()} />);
    const labels = [...document.querySelectorAll('label')].map((l) => l.textContent);
    const order = [
      t.leads.studentName,
      t.leads.country,
      t.leads.city,
      t.leads.filledBy,
      t.guardians.name,
      t.leads.altPhone,
      t.leads.level,
      t.leads.tz,
      t.leads.groupKind,
      t.leads.notes,
    ];
    expect(order.filter((l) => !labels.includes(l))).toEqual([]);
    expect(order.map((l) => labels.indexOf(l))).toEqual(
      [...order.map((l) => labels.indexOf(l))].sort((a, b) => a - b),
    );
    fireEvent.change(screen.getByLabelText(t.leads.city), { target: { value: 'جدة' } });
    fireEvent.change(screen.getByLabelText(t.leads.filledBy), { target: { value: 'student' } });
    expect(screen.getByRole('option', { name: t.leads.filledByOption.guardian })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.leads.groupKind), { target: { value: 'individual' } });
    fireEvent.change(screen.getByLabelText(t.leads.notes), { target: { value: 'بعد المغرب' } });
    mockApi.onWrite(() => lead());
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'PATCH',
        path: '/leads/lead-1/qualification',
        body: {
          city: 'جدة',
          filled_by: 'student',
          group_kind: 'individual',
          notes: 'بعد المغرب',
        },
      }),
    );
  });

  it("an impossible age gets the registration form's message", async () => {
    renderWithClient(<QualificationForm lead={lead()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(t.leads.studentAge), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByText(t.students.ageInvalid)).toBeTruthy();
    expect(mockApi.writes()).toHaveLength(0);
  });
});
