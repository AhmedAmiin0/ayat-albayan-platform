import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeacherStudents } from './TeacherStudents';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('TeacherStudents, English', () => {
  it('two separate tabs, row facts and an empty trial list read in English', async () => {
    const row = { id: 's1', code: 'AB-0183', name: 'Suhaila', status: 'active', program: 'quran', level: null, age: 9, next_lesson_at: null };
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('trial') ? [] : [row]));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherStudents />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Suhaila')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Subscribed' })).toBeTruthy();
    expect(screen.getByText(/9 years/)).toBeTruthy();
    expect(screen.getByText('No upcoming lesson')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Trial' }));
    expect(await screen.findByText('You have no trial students right now')).toBeTruthy();
  });
});
