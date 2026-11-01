import { describe, expect, it } from 'vitest';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { AssistantPaySettings } from '@/modules/finance/assistant-pay/shared/assistant-pay.settings';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { TermsQueries } from './terms.queries';

// «عمولة التجديد» (owner 2026-11-01): the terms views show the share a renewal earns NOW,
// 0 while it is off.
const share = (over: Parameters<typeof fakeSettings>[0]) =>
  new TermsQueries(fakeDb({}).db, new AssistantPaySettings(fakeSettings(over))).renewalShare();

describe('TermsQueries.renewalShare', () => {
  it('on (the default): renewal_commission_percent', async () => {
    expect(await share({})).toBe(50);
    expect(await share({ renewal_commission_percent: 80 })).toBe(80);
  });

  it('off: 0, whatever the percent (kept for when it is on again)', async () => {
    const off = { renewal_commission_enabled: false, renewal_commission_percent: 80 };
    expect(await share(off)).toBe(0);
  });
});
