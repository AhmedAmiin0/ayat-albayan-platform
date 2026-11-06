import { renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useSearchSections } from './use-search-sections';

// The chats list's header (docs/37): none for an empty box (no 12pt header gap), the hint at 1–2.

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const sections = (q: string) =>
  renderHook(
    () => useSearchSections({ q, mode: { kind: 'admin' }, base: '', now: new Date(), chats: 1 }),
    { wrapper: queryWrapper(createTestQueryClient()) },
  );

test('an empty search box: no list header at all', async () => {
  const { result } = await sections('');
  expect(result.current.header).toBeNull();
});

test('1–2 characters: the hint is the header', async () => {
  const { result } = await sections('در');
  expect(result.current.header).not.toBeNull();
});
