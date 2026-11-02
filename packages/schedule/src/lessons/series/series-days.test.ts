import { describe, expect, it } from 'vitest';
import { shiftByday, type SeriesShift } from './series-days.js';

describe('shiftByday (R-SCH-07): a moved series keeps its weekly count', () => {
  it.each<[string, SeriesShift, number[]]>([
    ['Sun+Wed, Wed → Thu', { byday: [0, 3], from: 3, to: 4 }, [1, 4]],
    ['Sun+Wed, Sun → Sat (wraps back)', { byday: [0, 3], from: 0, to: 6 }, [2, 6]],
    ['Fri, Fri → Sun (wraps forward)', { byday: [5], from: 5, to: 0 }, [0]],
    ['same day, later time', { byday: [1, 4], from: 4, to: 4 }, [1, 4]],
    ['three days', { byday: [0, 2, 4], from: 2, to: 3 }, [1, 3, 5]],
  ])('%s', (_, shift, out) => {
    expect(shiftByday(shift)).toEqual(out);
  });
});
