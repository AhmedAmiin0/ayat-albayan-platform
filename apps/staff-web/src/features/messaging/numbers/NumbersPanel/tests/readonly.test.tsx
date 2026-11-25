import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { PARITY_SAME } from '@/features/messaging/numbers/numbers.fixture';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['settings.read'], can: (p: string) => p === 'settings.read' }),
}));

const n = t.numbers;

afterEach(() => apiFetch.mockReset());

describe('«الأرقام» without numbers.manage', () => {
  it('shows the cards, parity and source read-only: no buttons, no fields, the read-only note', async () => {
    renderPanel(apiFetch);
    const first = await screen.findByRole('article', { name: 'Notifications line' });
    expect(screen.getByText(n.readOnly)).toBeTruthy();
    expect(within(first).getByText(n.secret.notSet)).toBeTruthy();
    expect(within(first).queryAllByRole('textbox')).toHaveLength(0);
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(0);
    expect(await screen.findByText(n.parity.empty)).toBeTruthy();
    expect(screen.getByText(n.source.current.replace('{{source}}', n.source[PARITY_SAME.source]))).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('a failed load says so', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    const { renderWithClient } = await import('@/features/messaging/inbox/testing/test-utils');
    const { NumbersPanel } = await import('@/features/messaging/numbers/NumbersPanel/NumbersPanel');
    renderWithClient(<NumbersPanel query="" onSaved={vi.fn()} />);
    expect(await screen.findByText(n.loadError)).toBeTruthy();
  });
});
