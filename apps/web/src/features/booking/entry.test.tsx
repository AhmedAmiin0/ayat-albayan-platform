import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StudentProfilePage } from '@/features/students/StudentProfilePage';
import { t } from '@/lib/i18n';
import { respond, STUDENT_ID } from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, className }: { to: string; search: Record<string, string>; children: ReactNode; className?: string }) => (
    <a href={`${to}?${new URLSearchParams(search)}`} className={className}>{children}</a>
  ),
}));

describe('booking entry on the student profile (R-SCH-06)', () => {
  it('«احجز حلقات» opens the wizard for this student, as a secondary next to the status', async () => {
    apiFetch.mockImplementation(respond);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentProfilePage studentId={STUDENT_ID} />
      </QueryClientProvider>,
    );
    const link = await screen.findByRole('link', { name: t.booking.open });
    expect(link.getAttribute('href')).toBe(`/admin/book?studentId=${STUDENT_ID}`);
    expect(link.className).toContain('bg-secondary');
  });
});
