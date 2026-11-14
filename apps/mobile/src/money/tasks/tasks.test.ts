import { t } from '@ab/mobile-kit';
import { taskText } from './tasks';

test('each task kind has its own sentence', () => {
  expect(taskText({ kind: 'renewal_due' })).toBe(t.mobileMoney.taskRenewalDue);
  expect(taskText({ kind: 'subscription_unpaid' })).toBe(t.mobileMoney.taskUnpaid);
});
