import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AvailabilityGrid } from './AvailabilityGrid';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiSend, apiFetch: vi.fn() }));

const CAIRO = 'Africa/Cairo';
const SAT = t.enums.weekday[6];
const ROWS = [{ weekday: 6, start_time: '16:00', end_time: '18:30', tz: CAIRO }];

function renderGrid(rows = ROWS) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AvailabilityGrid teacherId="t1" tz={CAIRO} rows={rows} />
    </QueryClientProvider>,
  );
}
const save = () => screen.getByRole('button', { name: t.availability.save });

describe('AvailabilityGrid (R-TCH-02)', () => {
  beforeEach(() => apiSend.mockReset());

  it('shows all seven weekdays in Arabic and the stored range', () => {
    renderGrid();
    for (const day of Object.values(t.enums.weekday)) expect(screen.getByText(day)).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>(`${SAT} ${t.availability.from}`).value).toBe('16:00');
    expect(screen.getByText(t.availability.tzHint.replace('{tz}', CAIRO))).toBeTruthy();
  });

  it('adds a range after the last one and saves the whole grid with PUT', async () => {
    apiSend.mockResolvedValue([]);
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: `${t.availability.addSlot} ${SAT}` }));
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(t.availability.saved));
    expect(apiSend).toHaveBeenCalledWith('PUT', '/teachers/t1/availability', {
      slots: [
        { weekday: 6, start_time: '16:00', end_time: '18:30', tz: CAIRO },
        { weekday: 6, start_time: '18:30', end_time: '19:30', tz: CAIRO },
      ],
    });
  });

  it('flags overlapping ranges and blocks saving', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: `${t.availability.addSlot} ${SAT}` }));
    const starts = screen.getAllByLabelText(`${SAT} ${t.availability.from}`);
    fireEvent.change(starts[1] as HTMLInputElement, { target: { value: '17:00' } });
    expect(screen.getByRole('alert').textContent).toBe(t.availability.overlap);
    expect((save() as HTMLButtonElement).disabled).toBe(true);
  });

  it('flags a range that ends before it starts', () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText(`${SAT} ${t.availability.to}`), { target: { value: '15:00' } });
    expect(screen.getByRole('alert').textContent).toBe(t.common.endBeforeStart);
  });

  it('removing the last range lets an empty grid be saved', async () => {
    apiSend.mockResolvedValue([]);
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: `${t.availability.removeSlot} ${SAT}` }));
    fireEvent.click(save());
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/teachers/t1/availability', { slots: [] }));
  });
});
