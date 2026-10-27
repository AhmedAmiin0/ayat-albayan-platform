import { dragBy } from './swipe-reply.helpers';

// Arabic (jest.setup: RTL): the inline-end is the left, so every bubble, ours and theirs, answers a swipe left.
test('Arabic: a swipe to the left (-dx) answers; to the right does nothing', async () => {
  expect(await dragBy(-60)).toEqual({ claims: true, answered: true });
  expect(await dragBy(60)).toEqual({ claims: false, answered: false });
});
