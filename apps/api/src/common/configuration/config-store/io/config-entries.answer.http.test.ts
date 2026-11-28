import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configRow } from '@/common/configuration/config-store/config-store.fakes';
import { configEntriesApp } from './config-entries.test-util';

describe('GET /config/entries answer', () => {
  let h: Awaited<ReturnType<typeof configEntriesApp>>;
  let app: NestFastifyApplication;
  const answerWith = async (updatedAt: string) => {
    const snap = { rev: 1, rows: [configRow('upload_max_mb', 4, { updatedAt })] };
    h.store.snapshot.mockResolvedValue(snap);
    h.store.fresh.mockResolvedValue(snap);
    h.store.names.mockResolvedValue(new Map());
    return h.call({ method: 'GET', url: '/config/entries' });
  };

  beforeAll(async () => {
    h = await configEntriesApp();
    app = h.app;
  });
  afterAll(() => app.close());

  it('passes rows inside the shared schema through', async () => {
    const res = await answerWith('2026-10-23T10:00:00.123456+00:00');
    expect(res.statusCode).toBe(200);
  });

  it('is 500 response_invalid for a save time without an offset', async () => {
    const res = await answerWith('2026-10-23 10:00');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'response_invalid' });
  });
});
