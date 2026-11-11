import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setConfirmationRequired } from '@/lib/settings/confirmation-testing';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonActions } from './LessonActions';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(),
  apiSend: vi.fn(),
}));

function renderActions(hideConfirm?: boolean) {
  render(
    <QueryClientProvider client={setConfirmationRequired(new QueryClient(), true)}>
      <LessonActions lesson={lesson({ starts_at: '2026-12-06T14:00:00.000Z' })} onDone={vi.fn()} hideConfirm={hideConfirm} />
    </QueryClientProvider>,
  );
}

describe('LessonActions hideConfirm (docs/46 D1: the teacher card)', () => {
  it('the admin keeps the family-style confirm', () => {
    renderActions();
    expect(screen.getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
  });

  it('the teacher card hides it', () => {
    renderActions(true);
    expect(screen.queryByRole('button', { name: t.lessons.event.confirm })).toBeNull();
  });
});
