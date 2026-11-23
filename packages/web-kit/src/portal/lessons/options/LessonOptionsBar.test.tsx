import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { kid, lesson } from '#/portal/portal.fixtures.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { LessonOptionsBar } from './LessonOptionsBar';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiSend, apiFetch }));

const NOW = new Date('2026-10-26T10:00:00.000Z');
const A = t.portal.actions;
const needs = (counts = false) => lesson({ status: 'scheduled', family: { group: false, counts, request: null } });
const show = (l = needs()) =>
  renderPortal(<LessonOptionsBar lesson={l} student={kid()} now={NOW} />);
const RESULT = { lesson_id: 'l1', status: 'confirmed', counts: false };

describe('«خيارات الحلقة» on the web portal (owner 2026-11-17)', () => {
  afterEach(() => {
    apiSend.mockReset();
    apiFetch.mockReset();
  });

  it('«سأحضر» confirms and says so', async () => {
    apiSend.mockResolvedValue(RESULT);
    show();
    fireEvent.click(screen.getByRole('button', { name: A.confirm }));
    expect(await screen.findByText(A.confirmedNotice)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lessons/l1/confirm', undefined);
  });

  it('«أعتذر»: the package line, then the excuse with its reason', async () => {
    apiSend.mockResolvedValue({ ...RESULT, status: 'excused' });
    show(needs(true));
    fireEvent.click(screen.getByRole('button', { name: A.decline }));
    expect(screen.getByText(A.countsYes)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(A.reasonLabel), { target: { value: 'سفر' } });
    fireEvent.click(screen.getByRole('button', { name: A.declineConfirm }));
    expect(await screen.findByText(A.declinedNotice)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/portal/students/s1/lessons/l1/cancel', { reason: 'سفر' });
  });

  it('a refused action says why in the family’s words', async () => {
    const { ApiError } = await import('@ab/client-core');
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
    show();
    fireEvent.click(screen.getByRole('button', { name: A.confirm }));
    expect(await screen.findByText(A.errors.lesson_started)).toBeTruthy();
  });

  it('«اطلب موعدًا آخر» opens the free times of the week in a side panel', async () => {
    apiFetch.mockResolvedValue({ tz: 'Africa/Cairo', step_min: 30, slots: [] });
    show();
    fireEvent.click(screen.getByRole('button', { name: A.request }));
    expect(await screen.findByRole('dialog', { name: A.request })).toBeTruthy();
    await vi.waitFor(() => expect(apiFetch.mock.calls[0]?.[0]).toMatch(/\/lessons\/l1\/slots\?from=/));
    expect(screen.getByRole('button', { name: A.send })).toHaveProperty('disabled', true);
  });

  it('«سأحضر» is said at once (optimistic), then taken back if the academy refuses', async () => {
    const { ApiError } = await import('@ab/client-core');
    let refuse: (e: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((_ok, no) => (refuse = no)));
    show();
    fireEvent.click(screen.getByRole('button', { name: A.confirm }));
    expect(screen.getByRole('status').textContent).toBe(A.confirmedNotice);
    refuse(new ApiError(409, { code: 'lesson_started' }));
    expect(await screen.findByText(A.errors.lesson_started)).toBeTruthy();
    expect(screen.queryByText(A.confirmedNotice)).toBeNull();
  });

  it('a started lesson offers nothing', () => {
    renderPortal(<LessonOptionsBar lesson={needs()} student={kid()} now={new Date('2026-10-27T16:00:00Z')} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
