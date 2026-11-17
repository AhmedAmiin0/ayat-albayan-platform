import { participantNames } from './participants';

const m = (sender_name: string, mine = false) => ({ sender_name, mine });

test('every other sender once, newest first, «أنت» last', () => {
  const list = [m('فاطمة'), m('زهراء'), m('أنا', true), m('فاطمة'), m('يوسف')];
  expect(participantNames(list, 'أنت')).toEqual(['يوسف', 'فاطمة', 'زهراء', 'أنت']);
});

test('nameless senders are left out; an empty thread is only «أنت»', () => {
  expect(participantNames([m('  ')], 'You')).toEqual(['You']);
  expect(participantNames([], 'You')).toEqual(['You']);
});

test('at most four names before «أنت»', () => {
  const list = ['أ', 'ب', 'ج', 'د', 'هـ'].map((n) => m(n));
  expect(participantNames(list, 'أنت')).toHaveLength(5);
});
