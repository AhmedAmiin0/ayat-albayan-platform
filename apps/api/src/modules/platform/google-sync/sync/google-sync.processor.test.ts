import { describe, expect, it, vi } from 'vitest';
import type { GoogleConnection } from '../oauth/google-connection';
import { GoogleApiError } from '../google-client.port';
import { FakeGoogle } from '../http/google-client.fake';
import type { GoogleData } from '../google-data';
import { msUntilReconcile } from './google-sync.job';
import { GoogleSyncProcessor } from './google-sync.processor';
import { fakeData, item } from '../google-sync.fakes';
import type { GoogleWriters } from './google-writers';

function setup(write: ReturnType<typeof vi.fn>) {
  const data = fakeData();
  const google = new FakeGoogle();
  const connection = { client: vi.fn().mockResolvedValue(google), authFailed: vi.fn() };
  const writers = { of: () => ({ write }) };
  const p = new GoogleSyncProcessor(data as unknown as GoogleData, connection as unknown as GoogleConnection, writers as unknown as GoogleWriters);
  return { p, data, connection, google };
}

describe('GoogleSyncProcessor', () => {
  it('does nothing while sync is OFF (no claim, no client)', async () => {
    const s = setup(vi.fn());
    s.data.settings.read.mockResolvedValue({ enabled: false, mode: 'live', window_days: 60 });
    expect((await s.p.runOnce()).claimed).toBe(0);
    expect(s.data.items.claim).not.toHaveBeenCalled();
    expect(s.connection.client).not.toHaveBeenCalled();
  });

  it('dry_run never builds a Google client', async () => {
    const write = vi.fn().mockResolvedValue({ state: 'skipped', reason: 'dry_run' });
    const s = setup(write);
    s.data.settings.read.mockResolvedValue({ enabled: true, mode: 'dry_run', window_days: 60 });
    s.data.items.claim.mockResolvedValue([item()]);
    await s.p.runOnce();
    expect(s.connection.client).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.anything(), { live: false });
  });

  it('live but not connected: nothing is claimed', async () => {
    const s = setup(vi.fn());
    s.connection.client.mockResolvedValue(null);
    await s.p.runOnce();
    expect(s.data.items.claim).not.toHaveBeenCalled();
  });

  it('429 retries later with backoff; the 5th failure is final; a 400 fails at once', async () => {
    const write = vi.fn().mockRejectedValue(new GoogleApiError(429, 'rateLimitExceeded'));
    const s = setup(write);
    s.data.items.claim.mockResolvedValue([item({ attempts: 0 }), item({ id: 'b', attempts: 4 })]);
    await s.p.runOnce();
    const [[, first], [, last]] = s.data.items.finish.mock.calls as [[unknown, { state: string; attempts: number; at?: Date }], [unknown, { state: string }]];
    expect(first).toMatchObject({ state: 'retry', attempts: 1 });
    expect((first.at?.getTime() ?? 0) - Date.now()).toBeGreaterThan(10_000);
    expect(last).toMatchObject({ state: 'failed', attempts: 5 });
    write.mockRejectedValue(new GoogleApiError(400, 'badRequest'));
    s.data.items.claim.mockResolvedValue([item()]);
    await s.p.runOnce();
    expect(s.data.items.finish.mock.calls.at(-1)?.[1]).toMatchObject({ state: 'failed', error: '400 badRequest' });
  });

  it('invalid_grant disconnects once, releases the rest, never loops', async () => {
    const write = vi.fn().mockRejectedValue(new GoogleApiError(400, 'invalid_grant'));
    const s = setup(write);
    s.data.items.claim.mockResolvedValue([item(), item({ id: 'b' }), item({ id: 'c' })]);
    const out = await s.p.runOnce();
    expect(out.stopped).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(s.connection.authFailed).toHaveBeenCalledTimes(1);
    expect(s.data.items.release).toHaveBeenCalledTimes(3);
    expect(s.data.items.finish).not.toHaveBeenCalled();
  });
});

describe('a report PDF that reaches Drive', () => {
  it('re-queues its attendance and summary rows', async () => {
    const s = setup(vi.fn().mockResolvedValue({ state: 'synced', googleId: 'f1', parentId: 'p', hash: 'h' }));
    s.data.items.claim.mockResolvedValue([item({ kind: 'report_pdf', subject_id: 'r1', student_id: 's1' })]);
    await s.p.runOnce();
    expect(s.data.items.requeueReportRows).toHaveBeenCalledWith({ reportId: 'r1', studentId: 's1' });
  });
});

describe('daily reconcile timing', () => {
  it('runs at 05:00 Riyadh = 02:00 UTC', () => {
    expect(msUntilReconcile(new Date('2026-10-22T01:00:00Z'))).toBe(3_600_000);
    expect(msUntilReconcile(new Date('2026-10-22T02:00:00Z'))).toBe(86_400_000);
    expect(msUntilReconcile(new Date('2026-10-22T03:00:00Z'))).toBe(23 * 3_600_000);
  });
});

describe('stopping a live pass', () => {
  it('invalid_client pauses the pass and KEEPS the refresh token (a wrong client secret is not a dead grant)', async () => {
    const s = setup(vi.fn().mockRejectedValue(new GoogleApiError(401, 'invalid_client')));
    const configFailed = vi.fn();
    Object.assign(s.connection, { configFailed });
    s.data.items.claim.mockResolvedValue([item(), item({ id: 'b' })]);
    expect((await s.p.runOnce()).stopped).toBe(true);
    expect(configFailed).toHaveBeenCalledTimes(1);
    expect(s.connection.authFailed).not.toHaveBeenCalled();
    expect(s.data.items.release).toHaveBeenCalledTimes(2);
  });

  it('sync turned OFF mid-pass: the rest of the batch is released, never written', async () => {
    const write = vi.fn().mockResolvedValue({ state: 'synced', googleId: 'e', parentId: 'c', hash: 'h' });
    const s = setup(write);
    s.data.settings.read.mockResolvedValueOnce({ enabled: true, mode: 'live', window_days: 60 }).mockResolvedValueOnce({ enabled: true, mode: 'live', window_days: 60 })
      .mockResolvedValue({ enabled: false, mode: 'live', window_days: 60 });
    s.data.items.claim.mockResolvedValue([item(), item({ id: 'b' }), item({ id: 'c' })]);
    expect((await s.p.runOnce()).stopped).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(s.data.items.release).toHaveBeenCalledTimes(2);
    expect(s.data.items.touch).toHaveBeenCalledTimes(1);
  });
});
