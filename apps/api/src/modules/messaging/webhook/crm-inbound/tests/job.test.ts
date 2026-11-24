import { describe, expect, it, vi } from 'vitest';
import { CrmInboundJob } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.job';
import type { CrmInbound } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.service';

// The mirror's runs: a kick drains the queue once; a failed pass is only logged (Ticker).

describe('CrmInboundJob', () => {
  it('kick runs one drain; a failed drain never throws', async () => {
    const drain = vi.fn().mockResolvedValueOnce(1).mockRejectedValueOnce(new Error('db down'));
    const job = new CrmInboundJob({ drain } as unknown as CrmInbound);
    await job.kick();
    await expect(job.kick()).resolves.toBeUndefined();
    expect(drain).toHaveBeenCalledTimes(2);
  });
});
