import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { publicConfigQuery, usePlatformClassroom } from './public-config';

function Probe({ flag }: { flag: boolean | undefined }) {
  return <p data-testid="probe">{String(usePlatformClassroom(flag))}</p>;
}

/** `auto`: settings.meeting_link_auto as GET /settings/public answered it. */
function probe(flag: boolean | undefined, auto: boolean): string | null {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <Probe flag={flag} />
    </QueryClientProvider>,
  );
  const text = screen.getByTestId('probe').textContent;
  unmount();
  return text;
}

it('the payload’s own platform_classroom wins over the academy default', () => {
  expect(probe(false, true)).toBe('false');
  expect(probe(true, false)).toBe('true');
});

it('platform_classroom absent (a payload cached before migration 490): the academy default', () => {
  expect(probe(undefined, true)).toBe('true');
  expect(probe(undefined, false)).toBe('false');
});
