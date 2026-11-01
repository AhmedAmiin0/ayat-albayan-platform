import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { googleTeachers } from '@/features/platform/google-sync/google.fixture';
import { renderGoogle } from '@/features/platform/google-sync/google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.teachers;
const rowOf = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('teacher ↔ calendar mapping', () => {
  it('preselects the suggestion and «تأكيد» sends its calendar id', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote });
    const row = await rowOf('Teacher A');
    expect(within(row).getByText(s.suggested.replace('{name}', 'Calendar Teacher A'))).toBeTruthy();
    expect((within(row).getByRole('combobox') as HTMLSelectElement).value).toBe('fake-cal-a@group.calendar.example');
    const saved = googleTeachers().map((r, i) => (i === 0 ? { ...r, calendar_id: 'fake-cal-a@group.calendar.example', calendar_name: 'Calendar Teacher A', confirmed_at: '2026-10-22T09:00:00Z' } : r));
    apiSend.mockResolvedValue(saved);
    fireEvent.click(within(row).getByRole('button', { name: t.googleSync.common.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/teachers/teacher-1', { calendar_id: 'fake-cal-a@group.calendar.example' }),
    );
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(t.googleSync.common.saved));
    const after = await rowOf('Teacher A');
    // The chip now names the confirmed calendar (beside its option) and «تأكيد» rests until a change.
    await waitFor(() => expect(within(after).getAllByText('Calendar Teacher A')).toHaveLength(2));
    expect((within(after).getByRole('button', { name: t.googleSync.common.confirm }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('no suggestion: confirm stays disabled until a pick; «بدون تقويم» sends null', async () => {
    renderGoogle({ apiFetch });
    const row = await rowOf('Teacher B');
    const confirm = within(row).getByRole('button', { name: t.googleSync.common.confirm }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const select = within(row).getByRole('combobox') as HTMLSelectElement;
    const none = within(select).getByRole('option', { name: s.none }) as HTMLOptionElement;
    fireEvent.change(select, { target: { value: none.value } });
    apiSend.mockResolvedValue(googleTeachers());
    fireEvent.click(confirm);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/teachers/teacher-2', { calendar_id: null }));
  });

  it('lists only the discovered calendars as choices', async () => {
    renderGoogle({ apiFetch });
    const select = within(await rowOf('Teacher B')).getByRole('combobox');
    const names = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual([s.pick, s.none, 'Calendar Teacher A', 'Calendar Teacher B']);
  });

  it('no active teacher: the empty line', async () => {
    renderGoogle({ apiFetch, routes: [['/admin/google/teachers', []]] });
    expect(await screen.findByText(s.empty)).toBeTruthy();
  });
});
