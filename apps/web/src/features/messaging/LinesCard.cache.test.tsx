import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/testing/test-utils';
import { checked } from '@/features/templates/lines/template-lines-fixture';
import { t } from '@/lib/i18n/i18n';
import { linesCheckQuery } from './api';
import { LinesCard } from './LinesCard';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const s = t.templates.settings.lines;

afterEach(() => apiSend.mockReset());

// The template blocks read each line's formatted number from LinesCard's last good check (owner 2026-10-18).
describe('LinesCard shares its answer', () => {
  it('a good check lands in the shared lines-check cache; a failed one leaves it as it was', async () => {
    const views = [checked('notifications', '+1 555-000-1111'), checked('chat', null)];
    apiSend.mockResolvedValueOnce(views).mockRejectedValueOnce(new Error('boom'));
    const client = renderWithClient(<LinesCard />);
    expect(client.getQueryData(linesCheckQuery.queryKey)).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    await waitFor(() => expect(client.getQueryData(linesCheckQuery.queryKey)).toEqual(views));
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    expect((await screen.findByRole('status')).textContent).toContain(s.checkFailed);
    expect(client.getQueryData(linesCheckQuery.queryKey)).toEqual(views);
  });
});
