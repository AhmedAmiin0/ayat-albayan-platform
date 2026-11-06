import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { CourseDue } from './course-due';
import type { CourseDueRepo, UnbookedPackage } from './course-due.repo';

const PKG: UnbookedPackage = { subscriptionId: 'sub1', studentId: 'st1', student: 'سهيلة', phone: '+966500000000', soldBy: 's1' };
const DATA = { studentId: 'st1', open: 'course', phone: '+966500000000' };

function setup(repo: Partial<Record<keyof CourseDueRepo, () => Promise<unknown>>>) {
  const push = {
    notifyAdmins: vi.fn(async () => undefined),
    notifyProfiles: vi.fn(async () => undefined),
  };
  const due = new CourseDue(repo as unknown as CourseDueRepo, push as unknown as PushService);
  return { due, push };
}

describe('CourseDue (owner 2026-11-06)', () => {
  it('a paid link with no course: the assistant’s own title and the wizard’s data', async () => {
    const { due } = setup({ unbooked: async () => PKG });
    expect(await due.paidNotice('sub1', 's1')).toEqual({ profileId: 's1', title: 'تم الدفع: احجز أيام الحلقات', data: DATA });
  });

  it('booked already, or a failed read: no special notice (the usual «تم استلام دفعة»)', async () => {
    expect(await setup({ unbooked: async () => null }).due.paidNotice('sub1', 's1')).toBeUndefined();
    const broken = setup({ unbooked: () => Promise.reject(new Error('db down')) });
    expect(await broken.due.paidNotice('sub1', 's1')).toBeUndefined();
  });

  it('the sweep tells the admins and the seller, once per package (its subject), opening the wizard', async () => {
    const { due, push } = setup({ overdue: async () => [PKG, { ...PKG, subscriptionId: 'sub2', soldBy: null }] });
    expect(await due.sweep(new Date())).toBe(2);
    expect(push.notifyAdmins).toHaveBeenCalledWith('payment_due', {
      subject: 'course_unbooked:sub1',
      title: 'لم تُحجز أيام الحلقات',
      vars: { student: 'سهيلة', left: expect.any(String) },
      data: DATA,
    });
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ kind: 'payment_due', profileIds: ['s1'], subject: 'course_unbooked:sub1' }));
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ profileIds: [], subject: 'course_unbooked:sub2' }));
  });

  it('the sweep never throws', async () => {
    const { due } = setup({ overdue: () => Promise.reject(new Error('db down')) });
    expect(await due.sweep(new Date())).toBe(0);
  });

  it('a draft that clashed at payment: the admins and its assistant pick again (once per version)', async () => {
    const { due, push } = setup({ package: async () => PKG });
    await due.clash('sub1', { savedBy: 's9', savedAt: '2026-11-06T10:00:00.000Z' });
    const subject = 'course_draft_clash:sub1:2026-11-06T10:00:00.000Z';
    expect(push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject, data: DATA }));
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ subject, profileIds: ['s9'] }));
  });

  it('the clash alert never throws', async () => {
    const { due } = setup({ package: () => Promise.reject(new Error('db down')) });
    await expect(due.clash('sub1', { savedBy: 's9', savedAt: 'x' })).resolves.toBeUndefined();
  });
});
