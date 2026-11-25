import { expect, test } from 'vitest';
import type { ChannelParticipantView } from '@ab/shared';
import { headerPeople } from './people';

const m = (sender_name: string, mine = false) => ({ sender_name, mine });
const p = (name: string, me = false): ChannelParticipantView => ({ name, role: 'teacher', me });

test('the API’s members in its order, the viewer as «أنت» last', () => {
  const participants = [p('فاطمة'), p('أنا', true), p('زهراء')];
  const people = headerPeople({ participants, messages: [m('يوسف')], you: 'أنت' });
  expect(people).toMatchObject({ others: ['فاطمة', 'زهراء'], line: ['فاطمة', 'زهراء', 'أنت'] });
});

test('a monitor (no member is me): the people without «أنت»; nameless ones left out', () => {
  const people = headerPeople({ participants: [p('فاطمة'), p(' ')], messages: [], you: 'أنت' });
  expect(people.line).toEqual(['فاطمة']);
});

test('no member list (older API): every other sender once, newest first, «أنت» last', () => {
  const list = [m('فاطمة'), m('زهراء'), m('أنا', true), m('فاطمة'), m('يوسف')];
  const people = headerPeople({ participants: [], messages: list, you: 'أنت' });
  expect(people.line).toEqual(['يوسف', 'فاطمة', 'زهراء', 'أنت']);
});

test('nobody else known: an empty line; at most four names before «أنت»', () => {
  expect(headerPeople({ participants: [p('أنا', true)], messages: [], you: 'You' }).line).toEqual(
    [],
  );
  expect(headerPeople({ participants: [], messages: [m('  ')], you: 'You' }).line).toEqual([]);
  const many = ['أ', 'ب', 'ج', 'د', 'هـ'].map((n) => p(n));
  expect(headerPeople({ participants: many, messages: [], you: 'أنت' }).line).toHaveLength(4);
});

test('the first teacher among the others (the API lists teachers first); none without one', () => {
  const sales: ChannelParticipantView = { name: 'سارة', role: 'sales', me: false };
  const participants = [sales, p('أنا', true), p('فاطمة'), p('زهراء')];
  expect(headerPeople({ participants, messages: [], you: 'أنت' }).teacher).toBe('فاطمة');
  expect(headerPeople({ participants: [sales], messages: [], you: 'أنت' }).teacher).toBeNull();
});
