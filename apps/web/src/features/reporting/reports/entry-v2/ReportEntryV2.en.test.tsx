import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openV2, v2Content } from './v2-test-kit';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

describe('the new report form, English', () => {
  afterEach(() => apiFetch.mockReset());

  it('sections, parts and the picker read in English', async () => {
    const content = v2Content({ segments: [{ kind: 'revision', surah: 68, from: 1, to: 20, grade: 'good' }] });
    await openV2({ apiFetch, report: { content } });
    expect(screen.getByText('Lesson 2 of 4')).toBeTruthy();
    expect(screen.getByRole('group', { name: /Attendance/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Surah Al-Qalam · ayahs 1–20' })).toBeTruthy();
    expect(screen.getByText('20 ayahs · pp. 564–565')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send the report to the family' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Pick the surah and ayahs' })[0] as HTMLElement);
    expect(screen.getByRole('searchbox', { name: 'Search for a surah' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Surah Al-Faatiha/ })).toBeTruthy();
  });

  it('the admin view in English', async () => {
    const content = v2Content({ segments: [{ kind: 'revision', surah: 68, from: 1, to: 20, grade: 'good' }] });
    await openV2({ apiFetch, role: 'admin', report: { content, status: 'submitted', attendance: 'late', can_edit: false } });
    expect(screen.getByText('New form')).toBeTruthy();
    expect(screen.getByText('Attended late')).toBeTruthy();
    expect(screen.getByText(`Surah Al-Qalam · ayahs 1–20 · ${en.enums.grade.good}`)).toBeTruthy();
  });
});
