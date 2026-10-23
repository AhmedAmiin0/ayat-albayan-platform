import type { LineCheckView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { NumbersHealth } from './numbers.health';
import type { NumbersQueries } from './numbers.queries';

const view = (over: Partial<LineCheckView>): LineCheckView => ({
  line: 'notifications', configured: true, provider: 'meta', gaps: [], duplicate_chat_phone: false, phone_number_id: '1000000001',
  waba_id: null, app_id: null, display_phone_number: '+15550001111', verified_name: null, quality_rating: null, status: null,
  name_status: null, code_verification_status: null, subscribed_apps: null, errors: [], checked_at: '2026-10-23T08:00:00Z', ...over,
});

describe('NumbersHealth (#134 item 9)', () => {
  it('keeps each checked line\'s result on the rows of the phone id that was checked; skips unconfigured lines', async () => {
    const saveHealth = vi.fn(async () => undefined);
    await new NumbersHealth({ saveHealth } as unknown as NumbersQueries).save([view({}), view({ line: 'chat', configured: false, phone_number_id: null })]);
    expect(saveHealth).toHaveBeenCalledOnce();
    expect(saveHealth).toHaveBeenCalledWith('1000000001', expect.objectContaining({ display_phone_e164: '+15550001111', checked_at: '2026-10-23T08:00:00Z' }));
  });

  it('a failed write never fails the check', async () => {
    const saveHealth = vi.fn(async () => Promise.reject(new Error('down')));
    await expect(new NumbersHealth({ saveHealth } as unknown as NumbersQueries).save([view({})])).resolves.toBeUndefined();
  });
});
