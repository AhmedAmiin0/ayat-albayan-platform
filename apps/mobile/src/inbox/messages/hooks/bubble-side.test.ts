import { bubbleSide } from './bubble-side';

describe('bubble sides as WhatsApp: ours on the right, theirs on the left, whatever the language', () => {
  it('Arabic (RTL): ours sits at the inline-start (the right), theirs at the end (the left)', () => {
    expect(bubbleSide(true, true)).toEqual({ side: 'right', align: 'flex-start', outer: 'start', toCentre: -1 });
    expect(bubbleSide(false, true)).toEqual({ side: 'left', align: 'flex-end', outer: 'end', toCentre: 1 });
  });

  it('English (LTR): ours sits at the inline-end (the right), theirs at the start (the left)', () => {
    expect(bubbleSide(true, false)).toEqual({ side: 'right', align: 'flex-end', outer: 'end', toCentre: -1 });
    expect(bubbleSide(false, false)).toEqual({ side: 'left', align: 'flex-start', outer: 'start', toCentre: 1 });
  });
});
