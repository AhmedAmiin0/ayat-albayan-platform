import { isOpen, openIds, selectedDue, toggleAll, toggleId } from './selection';
import { SESSIONS } from './fixtures';

test('only sessions with something owed are open (a settled one is not selectable)', () => {
  expect(SESSIONS.map(isOpen)).toEqual([true, true, false]);
  expect(openIds(SESSIONS)).toEqual(['e3', 'e2']);
});

test('toggleId adds then removes', () => {
  expect(toggleId([], 'e3')).toEqual(['e3']);
  expect(toggleId(['e3', 'e2'], 'e3')).toEqual(['e2']);
});

test('select-all ticks every open session, a second press clears', () => {
  expect(toggleAll(SESSIONS, [])).toEqual(['e3', 'e2']);
  expect(toggleAll(SESSIONS, ['e2'])).toEqual(['e3', 'e2']);
  expect(toggleAll(SESSIONS, ['e3', 'e2'])).toEqual([]);
  expect(toggleAll([], [])).toEqual([]);
});

test('selected total = the outstanding of the ticked sessions, in piasters (no float drift)', () => {
  expect(selectedDue(SESSIONS, ['e3'])).toBe(100);
  expect(selectedDue(SESSIONS, ['e3', 'e2'])).toBe(150);
  expect(selectedDue(SESSIONS, ['e1', 'gone'])).toBe(0);
  const cents = [{ id: 'a', outstanding: 0.1 }, { id: 'b', outstanding: 0.2 }];
  expect(selectedDue(cents, ['a', 'b'])).toBe(0.3);
});
