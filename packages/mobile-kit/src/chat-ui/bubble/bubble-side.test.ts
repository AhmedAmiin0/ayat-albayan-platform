import { bubbleSide } from './bubble-side';

describe('bubble sides as WhatsApp: ours at the inline-end, theirs at the start (RN mirrors them)', () => {
  it('ours: flex-end, the tail corner at the end', () => {
    expect(bubbleSide(true)).toEqual({ align: 'flex-end', outer: 'end' });
  });

  it('theirs: flex-start, the tail corner at the start', () => {
    expect(bubbleSide(false)).toEqual({ align: 'flex-start', outer: 'start' });
  });
});
