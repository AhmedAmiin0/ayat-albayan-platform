import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { kapsoEnv } from '@/modules/messaging/webhook/external/external.fakes';
import { InboundGapAlert } from './inbound-gap.alert';
import { NOW } from './inbound.fakes';

const n = { env: kapsoEnv(), line: 'chat' as const, numberId: 'n-1' };

async function bodyFor(count: number): Promise<string> {
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const push = { notifyAdmins: vi.fn().mockResolvedValue(undefined) };
  await new InboundGapAlert(push as unknown as PushService).raise(n, { count, now: NOW });
  return (push.notifyAdmins.mock.calls[0]?.[1] as { vars: { text: string } }).vars.text;
}

afterEach(() => vi.restoreAllMocks());

describe('InboundGapAlert — the count in correct Arabic (one, two, few, other)', () => {
  it.each([
    [1, 'جُلبت رسالة واحدة متأخرة'],
    [2, 'جُلبت رسالتان متأخرتان'],
    [5, 'جُلبت 5 رسائل متأخرة'],
    [11, 'جُلبت 11 رسالة متأخرة'],
    [103, 'جُلبت 103 رسائل متأخرة'],
  ])('%i late messages', async (count, words) => {
    expect(await bodyFor(count)).toContain(words);
  });
});
