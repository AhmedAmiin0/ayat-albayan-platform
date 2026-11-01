import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StudentProfileForm } from './StudentProfileForm';
import { toProfileValues, toStudentPatch } from './profile-form';
import type { StudentProfile } from '@/features/people/students/types';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1, a docs/13 deviation) on the profile edit.

const api = vi.hoisted(() => ({ updateStudent: vi.fn() }));
vi.mock('@/features/people/students/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
  teacherOptionsQuery: queryOptions({ queryKey: ['teacher-options-contact'], queryFn: async () => [] }),
}));

const C = t.familyAuth.contactIsSelf;
const STUDENT = {
  id: 's1', name: 'سهيلة', program: 'quran', status: 'active', teacher_id: null, tz: 'Asia/Riyadh', level: null,
  memorized: null, goal: null, riwaya: null, meeting_link_override: null, notes: null,
} as StudentProfile;

describe('StudentProfileForm: contact_is_self', () => {
  beforeEach(() => api.updateStudent.mockReset());

  it('maps an absent value to «ولي الأمر» and always sends it in the PATCH', () => {
    expect(toProfileValues(STUDENT).contact_is_self).toBe(false);
    const r = toStudentPatch({ ...toProfileValues(STUDENT), contact_is_self: true }, 'active');
    expect(r.ok && r.patch.contact_is_self).toBe(true);
  });

  it('defaults to «ولي الأمر»; switching to «الطالب نفسه» saves true', async () => {
    api.updateStudent.mockResolvedValue({ ...STUDENT, contact_is_self: true });
    render(<QueryClientProvider client={new QueryClient()}><StudentProfileForm student={STUDENT} /></QueryClientProvider>);
    expect(screen.getByRole('radio', { name: C.guardian })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: C.self }));
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(api.updateStudent).toHaveBeenCalled());
    expect(api.updateStudent).toHaveBeenCalledWith('s1', expect.objectContaining({ contact_is_self: true }));
  });

  it('a saved self-contact student loads as «الطالب نفسه»', () => {
    render(<QueryClientProvider client={new QueryClient()}><StudentProfileForm student={{ ...STUDENT, contact_is_self: true }} /></QueryClientProvider>);
    expect(screen.getByRole('radio', { name: C.self })).toHaveProperty('checked', true);
  });
});
