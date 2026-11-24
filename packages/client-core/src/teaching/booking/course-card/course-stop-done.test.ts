import { describe, expect, it } from 'vitest';
import { stopDoneLines, type StopDoneWords } from './course-stop-done.js';

const words: StopDoneWords = {
  done: 'done',
  doneRefund: 'refund {amount}',
  doneStatus: 'now {status}',
  next: 'transfer {amount}',
  nextTell: 'tell them',
  notifiedFamily: 'family',
  notifiedTeacher: 'teacher',
  notifiedAdmins: 'admins',
};
const format = { money: (n: number) => `${n} SAR`, status: (s: string) => s };

describe('stopDoneLines', () => {
  it('a manual refund: the amount, the transfer as the next step, the admins told', () => {
    const refund = { amount: 90, card: 0, manual: 90 };
    const lines = stopDoneLines({ result: { refund, studentStatus: 'churned' }, words, format });
    expect(lines).toEqual({
      head: 'refund 90 SAR',
      status: 'now churned',
      next: 'transfer 90 SAR',
      notified: ['family', 'teacher', 'admins'],
    });
  });

  it('no refund: the plain head; the next step is telling them', () => {
    const lines = stopDoneLines({ result: { refund: null, studentStatus: 'churned' }, words, format });
    expect([lines.head, lines.next, lines.notified.length]).toEqual(['done', 'tell them', 2]);
  });
});
