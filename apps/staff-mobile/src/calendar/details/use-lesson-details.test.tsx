import { act, renderHook } from '@testing-library/react-native';
import type { LessonView } from '@ab/shared';
import { pending } from '@/today/testing/fixtures';
import { useLessonDetails } from './use-lesson-details';

test('reads the open lesson from the current list, keeps the last version seen, closes', async () => {
  const confirmed = { ...pending, status: 'confirmed' as const };
  const { result, rerender } = await renderHook(({ list }: { list: LessonView[] }) => useLessonDetails(list), {
    initialProps: { list: [pending] },
  });
  expect(result.current.lesson).toBeNull();
  await act(() => result.current.open(pending));
  await rerender({ list: [confirmed] });
  expect(result.current.lesson?.status).toBe('confirmed');
  // A refetch that no longer lists it keeps the confirmed one, not the scheduled one opened.
  await rerender({ list: [] });
  expect(result.current.lesson?.status).toBe('confirmed');
  await act(() => result.current.close());
  expect(result.current.lesson).toBeNull();
});
