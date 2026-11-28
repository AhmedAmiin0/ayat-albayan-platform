import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { AvailabilityGrid } from '@/features/people/teachers/availability/AvailabilityGrid/AvailabilityGrid';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiSend, apiFetch: vi.fn() }));

const SAT = t.enums.weekday[6];
const ROWS = [{ weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Asia/Riyadh' }];

afterEach(() => localStorage.removeItem(CLOCK_STORAGE_KEY));

describe('AvailabilityGrid on the web (12 h only)', () => {
  it('shows ص / م in the time selects, even with a saved 24 h choice, but saves «HH:MM» 24 h', async () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    apiSend.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AvailabilityGrid teacherId="t1" tz="Asia/Riyadh" rows={ROWS} />
      </QueryClientProvider>,
    );
    const end = screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.to}`);
    expect(screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.from}`).selectedOptions[0]?.textContent).toBe('4:00 م');
    fireEvent.change(end, { target: { value: '17:30' } });
    expect(end.selectedOptions[0]?.textContent).toBe('5:30 م');
    fireEvent.click(screen.getByRole('button', { name: t.availability.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('PUT', '/teachers/t1/availability', {
      slots: [{ weekday: 6, start_time: '16:00', end_time: '17:30', tz: 'Asia/Riyadh' }],
    });
  });
});
