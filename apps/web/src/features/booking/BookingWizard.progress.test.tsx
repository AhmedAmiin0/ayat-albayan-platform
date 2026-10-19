import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { draftFromLead } from './booking-entries';
import { BookingWizard, type BookingWizardProps } from './BookingWizard';
import { ABRAR, respond } from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const initial = draftFromLead({ leadId: 'lead-1', phone: '+966501234567', name: 'أم جود' }, null);
const filled = initial.newStudent ? { ...initial, newStudent: { ...initial.newStudent, name: 'جود' } } : initial;

function renderWizard(extra: Partial<BookingWizardProps> = {}) {
  apiFetch.mockImplementation(respond);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingWizard initial={filled} primary={null} siblings={[]} onOpenStudent={vi.fn()} {...extra} />
    </QueryClientProvider>,
  );
}

describe('BookingWizard initialStep / onProgress (docs/20 W9)', () => {
  afterEach(() => apiFetch.mockReset());

  it('without the new props it opens on the first step, as for the admin', () => {
    renderWizard();
    expect(screen.getByRole('region', { name: t.booking.steps.students })).toBeTruthy();
  });

  it('initialStep «teacher» opens on the teacher step; every step change is reported', async () => {
    const onProgress = vi.fn();
    renderWizard({ initialStep: 'teacher', onProgress });
    expect(screen.getByRole('region', { name: t.booking.steps.teacher })).toBeTruthy();
    expect(await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) })).toBeTruthy();
    expect(onProgress).toHaveBeenLastCalledWith({ draft: filled, step: 'teacher', booked: false });
    fireEvent.click(screen.getByRole('button', { name: t.booking.back }));
    expect(screen.getByRole('region', { name: t.booking.steps.students })).toBeTruthy();
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ step: 'students', booked: false }));
  });

  it('a draft edit is reported with the new draft', () => {
    const onProgress = vi.fn();
    renderWizard({ onProgress });
    fireEvent.change(screen.getByRole('textbox', { name: (n) => n.startsWith(t.leads.studentName) }), { target: { value: 'سهيلة' } });
    const last = onProgress.mock.calls.at(-1)?.[0];
    expect(last?.draft.newStudent?.name).toBe('سهيلة');
    expect(last?.step).toBe('students');
  });
});
