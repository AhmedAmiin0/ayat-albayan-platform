import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StudentProfileForm } from '@/features/people/students/profile/StudentProfileForm/StudentProfileForm';
import type { StudentProfile } from '@ab/shared';

const api = vi.hoisted(() => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), ...api }));

// Pause and stop statuses open their dialogs, never a bare status change.
const STUDENT = {
  id: 's1', name: 'سهيلة', program: 'quran', status: 'active', teacher_id: null, tz: 'Asia/Riyadh',
  level: null, memorized: null, goal: null, riwaya: null, meeting_link_override: null, notes: null,
} as StudentProfile;
const statusSelect = () => screen.getByLabelText<HTMLSelectElement>(t.students.status);

function renderForm() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StudentProfileForm student={STUDENT} />
    </QueryClientProvider>,
  );
}

describe('StudentProfileForm: the status leads to the pause and the stop', () => {
  beforeEach(() => {
    api.apiFetch.mockReset().mockImplementation(async (path: string) => {
      if (path.endsWith('/course-card')) return { subscriptionId: null, course: null, upcoming: [] };
      if (path.includes('/course-pause/preview')) return { from_date: '2026-11-17', until_date: null, lessons: 0 };
      return [];
    });
  });

  it('says so under the field; «موقوف مؤقتًا» opens «إيقاف الدورة مؤقتًا» and keeps the status', async () => {
    renderForm();
    expect(screen.getByText(t.courseCard.statusNote)).toBeTruthy();
    fireEvent.change(statusSelect(), { target: { value: 'paused' } });
    expect(await screen.findByRole('dialog', { name: t.coursePause.title })).toBeTruthy();
    expect(statusSelect().value).toBe('active');
  });

  it('«متوقف» without a package is set at once, as on mobile; no dialog', async () => {
    renderForm();
    fireEvent.change(statusSelect(), { target: { value: 'churned' } });
    await vi.waitFor(() => expect(statusSelect().value).toBe('churned'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«متوقف» with a package opens «إلغاء الاشتراك» of it and keeps the status', async () => {
    const stop = { subscriptionId: 'sub1', futureLessons: 0, activeRules: 0, paid: 0, currency: 'SAR' };
    api.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith('/course-card')) return { subscriptionId: 'sub1', course: null, upcoming: [] };
      if (path.includes('/course-stop')) return { ...stop, stopped: null, refundUnavailable: false };
      return [];
    });
    renderForm();
    fireEvent.change(statusSelect(), { target: { value: 'churned' } });
    expect(await screen.findByRole('dialog', { name: t.courseActions.stop.title })).toBeTruthy();
    expect(statusSelect().value).toBe('active');
    expect(api.apiFetch).toHaveBeenCalledWith('/students/s1/course-stop?subscriptionId=sub1');
  });
});
