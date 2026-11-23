import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { NUMBERS } from './numbers.fixture';
import { NumbersPanel } from './NumbersPanel';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

afterEach(() => apiFetch.mockReset());

describe('«الأرقام» when the parity cannot be loaded', () => {
  it('says so instead of silently dropping the parity and the source switch', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/admin/numbers') return NUMBERS;
      throw new Error('down');
    });
    renderWithClient(<NumbersPanel query="" onSaved={vi.fn()} />);
    expect(await screen.findByText(t.numbers.parity.loadError)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.numbers.source.toModule })).toBeNull();
  });
});
