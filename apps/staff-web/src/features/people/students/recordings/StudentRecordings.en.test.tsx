import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pageOf, recordingView } from './recordings-fixture';
import { StudentRecordings } from './StudentRecordings';
import { mockCall } from '@ab/testing/mock-call';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({
  ...(await orig<object>()),
  locale: 'en',
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('StudentRecordings, English', () => {
  it('title, status, facts, toggle and the admin delete read in English', async () => {
    mockApi.onRead(async ({ path }) =>
      path.includes('/recordings')
        ? pageOf([
            recordingView(),
            recordingView({ id: 'x', lesson_id: 'l-x', status: 'deleted', url: null }),
          ])
        : [],
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudentRecordings studentId="s-1" role="admin" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Ready')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Lesson recordings' })).toBeTruthy();
    expect(screen.getByText('Deleted')).toBeTruthy();
    expect(screen.getAllByText('50 MB')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Show to the student' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete recording' })).toBeTruthy();
    expect(screen.getAllByText('Ms. Mona')).toHaveLength(2);
    expect(screen.queryByText('أ. منى')).toBeNull();
    expect(screen.getByText('Hidden from the student and guardian.')).toBeTruthy();
  });
});
