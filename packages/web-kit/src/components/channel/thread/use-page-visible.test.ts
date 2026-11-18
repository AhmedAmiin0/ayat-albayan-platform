import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePageVisible } from './use-page-visible';

const show = (state: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

afterEach(() => vi.restoreAllMocks());

test('follows the tab: hidden, then shown again', () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const { result, unmount } = renderHook(() => usePageVisible());
  expect(result.current).toBe(true);
  show('hidden');
  expect(result.current).toBe(false);
  show('visible');
  expect(result.current).toBe(true);
  unmount();
});
