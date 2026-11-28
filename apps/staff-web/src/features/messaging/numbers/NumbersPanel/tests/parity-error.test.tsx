import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@ab/web-kit';
import { NUMBERS } from '@/features/messaging/numbers/numbers.fixture';
import { NumbersPanel } from '@/features/messaging/numbers/NumbersPanel/NumbersPanel';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => true }),
}));

afterEach(() => mockApi.reset('read'));

describe('«الأرقام» when the parity cannot be loaded', () => {
  it('says so instead of silently dropping the parity and the source switch', async () => {
    mockApi.onRead(async ({ path }) => {
      if (path === '/admin/numbers') return NUMBERS;
      throw new Error('down');
    });
    renderWithClient(<NumbersPanel query="" onSaved={vi.fn()} />);
    expect(await screen.findByText(t.numbers.parity.loadError)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.numbers.source.toModule })).toBeNull();
  });
});
