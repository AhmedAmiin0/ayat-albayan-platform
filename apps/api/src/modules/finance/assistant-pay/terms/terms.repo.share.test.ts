import { describe, expect, it } from 'vitest';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { AssistantPaySettings } from '@/modules/finance/assistant-pay/shared/assistant-pay.settings';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TermsRepo } from './terms.repo';

// Terms views show the share a renewal earns now, 0 while the renewal commission is off.
const share = (over: Parameters<typeof fakeSettings>[0]) =>
  new TermsRepo(fakeDb({}).db, new AssistantPaySettings(fakeSettings(over))).renewalShare();

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
