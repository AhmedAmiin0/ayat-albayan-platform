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
    expect(screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.from}`).value).toBe('16:00');
    const hint = t.availability.tzHint.replace('{tz}', CAIRO);
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === hint)).toBeTruthy();
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

  it('flags overlapping ranges and refuses to save, focusing the offending select (docs/07 §8)', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: `${t.availability.addSlot} ${SAT}` }));
    const starts = screen.getAllByLabelText(`${SAT} ${t.availability.from}`);
    fireEvent.change(starts[1] as HTMLSelectElement, { target: { value: '17:00' } });
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(t.availability.overlap);
    expect(starts[1]?.getAttribute('aria-invalid')).toBe('true');
    expect(starts[1]?.getAttribute('aria-describedby')).toBe(alert.id);
    fireEvent.click(save());
    expect(apiSend).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(starts[1]);
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

  it('saves in the zone picked in the tz select and shows the weekly summary', async () => {
    apiSend.mockResolvedValue([]);
    renderGrid();
    expect(screen.getByText(t.availability.weeklyHours.other.replace('{n}', '2.5'))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.availability.tz), { target: { value: 'Asia/Riyadh' } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/teachers/t1/availability', {
        slots: [{ weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Asia/Riyadh' }],
      }),
    );
  });

  it('«إلغاء» drops unsaved edits and the zone change', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('button', { name: `${t.availability.removeSlot} ${SAT}` }));
    fireEvent.change(screen.getByLabelText(t.availability.tz), { target: { value: 'Asia/Riyadh' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.getByLabelText<HTMLSelectElement>(`${SAT} ${t.availability.from}`).value).toBe('16:00');
    expect(screen.getByLabelText<HTMLSelectElement>(t.availability.tz).value).toBe(CAIRO);
  });
});
