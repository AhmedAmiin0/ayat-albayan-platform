import { messageGap } from './list-gap';

const theirs = { direction: 'inbound' } as const;
const ours = { direction: 'outbound' } as const;

test('the first message has no space over it', () => {
  expect(messageGap(undefined, theirs)).toBe(0);
});

test('4 between two from the same side, theirs or ours', () => {
  expect(messageGap(theirs, theirs)).toBe(4);
  expect(messageGap(ours, ours)).toBe(4);
});

test('8 where the side changes, either way', () => {
  expect(messageGap(theirs, ours)).toBe(8);
  expect(messageGap(ours, theirs)).toBe(8);
});
