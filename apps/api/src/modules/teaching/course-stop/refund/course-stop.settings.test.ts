import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { CourseStopSettings } from './course-stop.settings';

// «نسبة احتساب الحلقة المحضورة عند الاسترداد» (owner 2026-11-02): default 100 %, 0-300.
describe('CourseStopSettings', () => {
  it('reads only refund_attended_rate_percent, 100 by default', async () => {
    expect(SETTING_DEFAULTS.refund_attended_rate_percent).toBe(100);
    const read = await new CourseStopSettings(fakeSettings({})).read();
    expect(read).toEqual({ refund_attended_rate_percent: 100 });
  });

  it('a changed rate is what the refund uses', async () => {
    const store = fakeSettings({ refund_attended_rate_percent: 150 });
    const read = await new CourseStopSettings(store).read();
    expect(read.refund_attended_rate_percent).toBe(150);
  });
});
