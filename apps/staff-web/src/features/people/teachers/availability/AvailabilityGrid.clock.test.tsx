import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setClockPref } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { AvailabilityGrid } from './AvailabilityGrid';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', () => ({ apiSend, apiFetch: vi.fn() }));

const SAT = t.enums.weekday[6];
const ROWS = [{ weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Asia/Riyadh' }];

afterEach(() => setClockPref('24'));

describe('AvailabilityGrid in 12 h', () => {
  it('shows ص / م in the time selects but still saves «HH:MM» 24 h', async () => {
    setClockPref('12');
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
