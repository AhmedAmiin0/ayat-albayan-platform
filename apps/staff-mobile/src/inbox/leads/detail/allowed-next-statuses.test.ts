import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { allowedNextStatuses } from './allowed-next-statuses';

// Same rows as apps/api lead-state-machine.ts: a drift here is a status the API would 409.
const expected: [LeadStatus, LeadStatus[]][] = [
  ['new', ['contacted', 'no_reply', 'lost', 'interested_no_slot', 'trial_booked', 'converted']],
  ['contacted', ['interested_no_slot', 'trial_booked', 'no_reply', 'lost', 'converted']],
  ['interested_no_slot', ['trial_booked', 'no_reply', 'lost', 'converted']],
  ['no_reply', ['contacted', 'lost', 'interested_no_slot', 'converted']],
  ['trial_booked', ['trial_done', 'no_reply', 'lost', 'converted']],
  ['trial_done', ['converted', 'lost', 'interested_no_slot']],
  ['lost', ['contacted', 'converted']],
  ['converted', []],
];

test.each(expected)('%s → %j', (from, to) => {
  expect(allowedNextStatuses(from)).toEqual(to);
});

test('every status has a row, and no status moves to itself', () => {
  expect(expected.map(([from]) => from).sort()).toEqual([...LEAD_STATUSES].sort());
  for (const from of LEAD_STATUSES) expect(allowedNextStatuses(from)).not.toContain(from);
});

test('any open lead can become مشترك (a paid package booked straight from the chat)', () => {
  const into = LEAD_STATUSES.filter((s) => allowedNextStatuses(s).includes('converted'));
  expect(into).toEqual(LEAD_STATUSES.filter((s) => s !== 'converted'));
});
