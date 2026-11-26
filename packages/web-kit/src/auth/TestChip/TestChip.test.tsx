import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { pathKey } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MeTestChip } from '@ab/web-kit/auth/MeTestChip';
import { TestChip } from './TestChip';

const withMe = (me: object) => {
  const queries = { retry: false, staleTime: Infinity };
  const client = new QueryClient({ defaultOptions: { queries } });
  client.setQueryData(pathKey('/auth/me'), me);
  return render(
    <QueryClientProvider client={client}>
      <MeTestChip />
    </QueryClientProvider>,
  );
};

describe('«تجريبي» chips (docs/56)', () => {
  it('TestChip says تجريبي', () => {
    render(<TestChip />);
    expect(screen.getByText(t.testAccounts.chip)).toBeTruthy();
  });

  it('MeTestChip: only when /auth/me says is_test', () => {
    const { unmount } = withMe({ id: 'g1', role: 'guardian', permissions: [], is_test: true });
    expect(screen.getByText(t.testAccounts.chip)).toBeTruthy();
    unmount();
    withMe({ id: 'g2', role: 'guardian', permissions: [] });
    expect(screen.queryByText(t.testAccounts.chip)).toBeNull();
  });
});
