import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setClockPref, t } from '@ab/web-kit';
import { AvailabilityGrid } from '@/features/people/teachers/availability/AvailabilityGrid/AvailabilityGrid';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', () => ({
  call: (request: unknown) => mockApi.call(request),
}));

const SAT = t.enums.weekday[6];
const ROWS = [{ weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Asia/Riyadh' }];

afterEach(() => setClockPref('24'));

describe('AvailabilityGrid in 12 h', () => {
  it('shows ص / م in the time selects but still saves «HH:MM» 24 h', async () => {
    setClockPref('12');
    mockApi.onWrite(() => []);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AvailabilityGrid teacherId="t1" tz="Asia/Riyadh" rows={ROWS} />
      </QueryClientProvider>,
    );
    const end = screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.to}`);
    expect(
      screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.from}`).selectedOptions[0]
        ?.textContent,
    ).toBe('4:00 م');
    fireEvent.change(end, { target: { value: '17:30' } });
    expect(end.selectedOptions[0]?.textContent).toBe('5:30 م');
    fireEvent.click(screen.getByRole('button', { name: t.availability.save }));
    await waitFor(() => expect(mockApi.writes()).not.toHaveLength(0));
    expect(mockApi.writes()).toContainEqual({
      method: 'PUT',
      path: '/teachers/t1/availability',
      body: {
        slots: [{ weekday: 6, start_time: '16:00', end_time: '17:30', tz: 'Asia/Riyadh' }],
      },
    });
  });
});
