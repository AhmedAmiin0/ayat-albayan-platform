import { setViewerPersonTz } from '@ab/client-core';
import type { Conflict } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { ConflictNotice } from './ConflictNotice';
import { ProposalsPanel } from './ProposalsPanel';

// The React Compiler builds these components (vite.config.ts): a time read from the viewer-zone
// store during render would stay memoised. Each one switches the zone in place (a sign-in's
// /auth/me answering) and expects the new wall clock without a remount. November: Cairo is
// UTC+2 again (Riyadh UTC+3), so 14:00Z reads 17:00 → 16:00. test-setup pins Riyadh first.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const AT = '2026-11-01T14:00:00.000Z';
const busy: Conflict = { kind: 'teacher_busy', startsAt: AT, endsAt: AT };
const MOVED = lesson({
  id: 'l-p',
  starts_at: AT,
  pending_proposal: { id: 'pp', proposed_starts_at: '2026-11-02T15:00:00.000Z', note: null, created_at: AT },
});

describe('a viewer-zone change re-words the times in place (React Compiler)', () => {
  it('ConflictNotice: the clash time and the zone note', () => {
    render(<ConflictNotice conflicts={[busy]} onChangeSlot={vi.fn()} />);
    const line = () => screen.getByRole('listitem').textContent;
    expect(line()).toContain('17:00');
    act(() => setViewerPersonTz('Africa/Cairo'));
    expect(line()).toContain('16:00');
    expect(line()).not.toContain('17:00');
    expect(screen.getByText(t.schedule.zoneNote.replace('{city}', t.tz['Africa/Cairo']))).toBeTruthy();
  });

  it('ProposalsPanel: both sides of «from ← to»', async () => {
    apiFetch.mockResolvedValue([MOVED]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProposalsPanel onOpen={vi.fn()} />
      </QueryClientProvider>,
    );
    const row = await screen.findByRole('button');
    expect(row.textContent).toContain('17:00');
    expect(row.textContent).toContain('18:00');
    act(() => setViewerPersonTz('Africa/Cairo'));
    expect(row.textContent).toContain('16:00');
    expect(row.textContent).toContain('17:00');
    expect(row.textContent).not.toContain('18:00');
  });
});
