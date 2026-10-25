import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PARITY_SAME } from './numbers.fixture';
import { renderPanel } from './numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({
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
    const { renderWithClient } = await import('@/features/inbox/testing/test-utils');
    const { NumbersPanel } = await import('./NumbersPanel');
    renderWithClient(<NumbersPanel query="" onSaved={vi.fn()} />);
    expect(await screen.findByText(n.loadError)).toBeTruthy();
  });
});
