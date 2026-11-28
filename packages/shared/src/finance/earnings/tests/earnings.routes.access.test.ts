import { describe, expect, it } from 'vitest';
import { myEarningRoutes, teacherEarningRoutes } from '../earnings.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});
const earnings = (permission: string) => ({
  permissions: [permission],
  tags: ['teacher-earnings'],
});

describe('teacherEarningRoutes: access', () => {
  it('lets readers see the summary, a balance, sessions, payments and receipts', () => {
    const r = teacherEarningRoutes;
    for (const route of [r.summary, r.balance, r.sessions, r.payments, r.receipt]) {
      expect(accessOf(route)).toEqual(earnings('earnings.read'));
    }
  });

  it('keeps resync, voiding, recording and the receipt upload for writers', () => {
    const r = teacherEarningRoutes;
    for (const route of [r.resync, r.void, r.record, r.receiptUploadUrl]) {
      expect(accessOf(route)).toEqual(earnings('earnings.write'));
    }
  });
});

describe('myEarningRoutes: access', () => {
  it('shows a teacher only their own earnings, under the teachers tag', () => {
    const r = myEarningRoutes;
    for (const route of [r.balance, r.sessions, r.payments, r.receipt]) {
      expect(accessOf(route)).toEqual({ permissions: ['self.teacher'], tags: ['teachers'] });
    }
  });
});
