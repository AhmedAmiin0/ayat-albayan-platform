import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../common/push/push.service';
import { GoogleAlerts } from './google-alerts';
import { TEACHER_ID } from './google-sync.fakes';

describe('GoogleAlerts.scriptStillRunning', () => {
  const SINCE = '2026-10-28T08:00:00.000Z';
  const subjects = (push: { notifyAdmins: { mock: { calls: unknown[][] } } }) => push.notifyAdmins.mock.calls.map((c) => (c[1] as { subject: string }).subject);

  it('one bell row per teacher and handover: the same subject on every pass (PushService dedups it), never WhatsApp or a push', async () => {
    const push = { notifyAdmins: vi.fn().mockResolvedValue(undefined) };
    const alerts = new GoogleAlerts(push as unknown as PushService);
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A', since: SINCE });
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A', since: SINCE });
    expect(new Set(subjects(push))).toEqual(new Set([`script_calendar:${TEACHER_ID}:${SINCE}`]));
    expect(push.notifyAdmins).toHaveBeenCalledWith('google_sync_alert', {
      subject: `script_calendar:${TEACHER_ID}:${SINCE}`,
      vars: { reason: 'تقويم Teacher A ما زال يُبنى من الشيت: أوقف السكربت لهذا المعلم أولًا' },
      bellOnly: true,
    });
  });

  it('a later handover of the same teacher is told again', async () => {
    const push = { notifyAdmins: vi.fn().mockResolvedValue(undefined) };
    const alerts = new GoogleAlerts(push as unknown as PushService);
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A', since: SINCE });
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A', since: '2026-11-02T08:00:00.000Z' });
    expect(new Set(subjects(push)).size).toBe(2);
  });
});
