import { courseActionsKey, courseKeys, coursePauseKey, pauseKeys } from '@ab/client-core';
import { QueryClient } from '@tanstack/react-query';

const REF = { studentId: 's1', subscriptionId: 'sub1' };

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 1));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated);
};

it('refreshes every course read of one student after a course action, and no other', async () => {
  const mine = [
    courseKeys.current('s1', '/p'),
    courseKeys.stopPreview(REF),
    courseKeys.move(REF, 'teacher'),
    courseKeys.teachers('s1'),
    courseKeys.card('s1', 'admin'),
    courseKeys.extend(REF),
    pauseKeys.resume('s1'),
  ];
  const theirs = courseKeys.teachers('s2');
  expect(await staleAfter([...mine, theirs], courseActionsKey('s1'))).toEqual(mine);
});

it('refreshes the pause preview after a pause write, and not the card lesson', async () => {
  const preview = pauseKeys.preview({ studentId: 's1', from: 'a', until: null });
  const lesson = courseKeys.cardLesson('l1');
  expect(await staleAfter([preview, lesson], coursePauseKey('s1'))).toEqual([preview]);
});
