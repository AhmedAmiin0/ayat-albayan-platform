import { STUDENT_STATUSES } from '@ab/shared';
import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentProfileForm } from './StudentProfileForm';
import type { StudentProfile } from './types';

const TEACHER_ID = vi.hoisted(() => '11111111-1111-4111-8111-111111111111');
const api = vi.hoisted(() => ({ updateStudent: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
  teacherOptionsQuery: queryOptions({
    queryKey: ['teacher-options-test'],
    queryFn: async () => [{ id: TEACHER_ID, display_name_ar: 'أبرار', meeting_link: null }],
  }),
}));

const STUDENT = {
  id: 's1',
  name: 'سهيلة',
  program: 'quran',
  status: 'trial',
  teacher_id: null,
  tz: 'Asia/Riyadh',
  level: null,
  memorized: null,
  goal: null,
  riwaya: null,
  meeting_link_override: null,
  notes: null,
} as StudentProfile;

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentProfileForm student={STUDENT} />
    </QueryClientProvider>,
  );
}

describe('StudentProfileForm (R-STU-05)', () => {
  beforeEach(() => api.updateStudent.mockReset());

  it('the admin status select offers all eight statuses in the display order (owner 2026-10-15)', async () => {
    renderForm();
    await screen.findByText('أبرار');
    const select = screen.getByLabelText<HTMLSelectElement>(t.students.status);
    expect(select.value).toBe('trial');
    expect([...select.options].map((o) => o.value)).toEqual([...STUDENT_STATUSES]);
    expect([...select.options].map((o) => o.textContent)).toEqual(STUDENT_STATUSES.map((st) => t.enums.studentStatus[st]));
  });

  it('saves level, status and teacher as a PATCH', async () => {
    api.updateStudent.mockResolvedValue(STUDENT);
    renderForm();
    await screen.findByText('أبرار');
    expect(screen.getByLabelText(t.students.tz).tagName).toBe('SELECT'); // picked, never typed (rule 6)
    fireEvent.change(screen.getByLabelText(t.students.tz), { target: { value: 'Africa/Cairo' } });
    fireEvent.change(screen.getByLabelText(t.students.level), { target: { value: 'جزء عم' } });
    fireEvent.change(screen.getByLabelText(t.students.status), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText(t.students.teacher), { target: { value: TEACHER_ID } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await screen.findByText(t.students.updated);
    expect(api.updateStudent).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ level: 'جزء عم', status: 'active', teacher_id: TEACHER_ID, tz: 'Africa/Cairo', memorized: null }),
    );
  });

  it('shows the meeting-link hint and blocks an invalid link', async () => {
    renderForm();
    expect(screen.getByText(t.students.meetingLinkHint)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.students.meetingLink), { target: { value: 'zoom' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(t.students.invalidField.replace('{field}', t.students.meetingLink));
    await waitFor(() => expect(api.updateStudent).not.toHaveBeenCalled());
  });
});
