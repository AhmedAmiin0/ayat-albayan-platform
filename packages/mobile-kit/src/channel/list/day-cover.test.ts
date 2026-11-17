import { CHIP_MARGIN } from '../../chat-ui/days/top-band';
import { channelMessage } from '../testing/channel-fixtures';
import { chipSeparators, topDay } from './day-cover';

const token = (id: string, index: number, opensDay: boolean) => ({
  item: {
    ...{ message: channelMessage({ id }), dayText: `day-${id}`, opensDay },
    ...{ unread: null, space: 0, followUp: false },
  },
  key: id,
  index,
  isViewable: true,
});

test('the chips on screen are the rows that open a day, the chip under its margin', () => {
  const seps = chipSeparators([token('a', 0, false), token('b', 1, true)]);
  expect(seps).toEqual([{ key: 'b', label: 'day-b', inset: CHIP_MARGIN }]);
});

test('the top day is the highest index of the inverted list; none on an empty screen', () => {
  expect(topDay([token('b', 3, false), token('a', 1, false)])).toBe('day-b');
  expect(topDay([])).toBeNull();
});
