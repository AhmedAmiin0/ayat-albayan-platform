import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../common/push/push.service';
import { GoogleAlerts } from './google-alerts';
import { TEACHER_ID } from './google-sync.fakes';

describe('GoogleAlerts.scriptStillRunning', () => {
  it('one bell row per teacher: the same subject on every pass (PushService dedups it), never WhatsApp or a push', async () => {
    const push = { notifyAdmins: vi.fn().mockResolvedValue(undefined) };
    const alerts = new GoogleAlerts(push as unknown as PushService);
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A' });
    await alerts.scriptStillRunning({ teacherId: TEACHER_ID, name: 'Teacher A' });
    const subjects = push.notifyAdmins.mock.calls.map((c) => (c[1] as { subject: string }).subject);
    expect(new Set(subjects)).toEqual(new Set([`script_calendar:${TEACHER_ID}`]));
    expect(push.notifyAdmins).toHaveBeenCalledWith('google_sync_alert', {
      subject: `script_calendar:${TEACHER_ID}`,
      vars: { reason: 'تقويم Teacher A ما زال يُبنى من الشيت: أوقف السكربت لهذا المعلم أولًا' },
      bellOnly: true,
    });
  });
});
