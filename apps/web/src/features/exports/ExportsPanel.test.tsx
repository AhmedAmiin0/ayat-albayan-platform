import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ExportsPanel } from './ExportsPanel';

const downloadCsv = vi.hoisted(() => vi.fn());
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), downloadCsv }));

const PERIOD = { from: '2026-05-01', to: '2026-10-02' };
const button = (label: string) => screen.getByRole('button', { name: `${t.exports.download}: ${label}` });

describe('ExportsPanel (R-RPT-03)', () => {
  afterEach(() => downloadCsv.mockReset());

  it('lessons and payments export the dashboard period; students need no range', async () => {
    downloadCsv.mockResolvedValue(undefined);
    render(<ExportsPanel period={PERIOD} month="2026-09" />);
    fireEvent.click(button(t.exports.lessons));
    await waitFor(() => expect(downloadCsv).toHaveBeenCalledWith({ kind: 'lessons', params: PERIOD }));
    fireEvent.click(button(t.exports.students));
    await waitFor(() => expect(downloadCsv).toHaveBeenLastCalledWith({ kind: 'students' }));
  });

  it('payouts export the picked month', async () => {
    downloadCsv.mockResolvedValue(undefined);
    render(<ExportsPanel period={PERIOD} month="2026-09" />);
    fireEvent.change(screen.getByLabelText(t.exports.month), { target: { value: '2026-08' } });
    fireEvent.click(button(t.exports.payouts));
    await waitFor(() => expect(downloadCsv).toHaveBeenCalledWith({ kind: 'payouts', params: { month: '2026-08' } }));
  });

  it('while one file is prepared the buttons wait; an API error code is worded', async () => {
    let finish: (v?: unknown) => void = () => undefined;
    downloadCsv.mockReturnValueOnce(new Promise((r) => (finish = r)));
    render(<ExportsPanel period={PERIOD} month="2026-09" />);
    fireEvent.click(button(t.exports.payments));
    expect(await screen.findByText(t.exports.preparing)).toBeTruthy();
    expect((button(t.exports.students) as HTMLButtonElement).disabled).toBe(true);
    finish();
    downloadCsv.mockRejectedValueOnce(new ApiError(400, { code: 'range_too_large' }));
    await waitFor(() => expect((button(t.exports.students) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button(t.exports.payments));
    expect((await screen.findByRole('alert')).textContent).toBe(t.exports.error.range_too_large);
  });

  it('anything else is the generic failure line', async () => {
    downloadCsv.mockRejectedValue(new Error('network'));
    render(<ExportsPanel period={PERIOD} month="2026-09" />);
    fireEvent.click(button(t.exports.students));
    expect((await screen.findByRole('alert')).textContent).toBe(t.exports.failed);
  });
});
