import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG } from './classroom.fakes';
import { LivekitWebhookService } from './livekit-webhook.service';
import { recordingQueries, signedWebhook } from './moderation.fakes';
import type { RecordingQueries } from './recording.queries';

const NOW = new Date('2026-10-05T17:00:00Z');
let rq: ReturnType<typeof recordingQueries>;
const service = (config: typeof CONFIG | null = CONFIG) => new LivekitWebhookService(config, rq as unknown as RecordingQueries);
const post = (event: object) => {
  const rawBody = Buffer.from(JSON.stringify(event));
  return { rawBody, authorization: signedWebhook(rawBody, { now: NOW }) };
};

beforeEach(() => {
  rq = recordingQueries();
});

describe('LivekitWebhookService', () => {
  it('egress failed: the running row turns failed with the reason', async () => {
    await service().handle(post({ event: 'egress_ended', egressInfo: { egressId: 'EG_1', status: 'EGRESS_FAILED', error: 'no space' } }), NOW);
    expect(rq.finishByEgress).toHaveBeenCalledWith('EG_1', { status: 'failed', endedAt: NOW.toISOString(), error: 'no space' });
  });

  it('other events are acknowledged and change nothing', async () => {
    await service().handle(post({ event: 'participant_joined', participant: { identity: 'guest-1' } }), NOW);
    await service().handle(post({ event: 'egress_updated', egressInfo: { egressId: 'EG_1', status: 'EGRESS_ACTIVE' } }), NOW);
    expect(rq.finishByEgress).not.toHaveBeenCalled();
  });

  it('a signed but non-JSON body is acknowledged and ignored', async () => {
    const rawBody = Buffer.from('not json');
    await expect(service().handle({ rawBody, authorization: signedWebhook(rawBody, { now: NOW }) }, NOW)).resolves.toBeUndefined();
  });

  it('401 for a forged post, and whenever LiveKit is not configured', async () => {
    const forged = { ...post({ event: 'egress_ended' }), authorization: 'x.y.z' };
    await expect(service().handle(forged, NOW)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service(null).handle(post({ event: 'egress_ended' }), NOW)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rq.finishByEgress).not.toHaveBeenCalled();
  });
});
