import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { publicConfigQuery, usePlatformClassroom } from './public-config';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

/** `auto`: settings.meeting_link_auto as GET /settings/public answered it. */
async function platform(flag: boolean | undefined, auto: boolean): Promise<boolean> {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  const { result } = await renderHook(() => usePlatformClassroom(flag), { wrapper: queryWrapper(client) });
  return result.current;
}

test('the payload’s own platform_classroom wins over the academy default', async () => {
  expect(await platform(false, true)).toBe(false);
  expect(await platform(true, false)).toBe(true);
});

test('platform_classroom absent (a payload cached before migration 490): the academy default', async () => {
  expect(await platform(undefined, true)).toBe(true);
  expect(await platform(undefined, false)).toBe(false);
});
