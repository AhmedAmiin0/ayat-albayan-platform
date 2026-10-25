import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../common/audit/audit.service';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { RENEWAL_DUE_SEED } from './seed-templates.fakes';
import { ADMIN, whatsappApp } from '../../test-app';
import { type WhatsappLines } from '../../whatsapp.types';

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn(), approvals: vi.fn(async () => []) };
const client = { configured: vi.fn(), getTemplates: vi.fn(), submitTemplate: vi.fn(), canUploadSamples: vi.fn(), uploadSample: vi.fn() };
const chatClient = { configured: vi.fn(), getTemplates: vi.fn() };
const audit = { record: vi.fn() };
const lines = { notifications: client, chat: chatClient } as unknown as WhatsappLines;
const registry = () => new TemplateRegistry(queries as unknown as TemplatesQueries, lines, audit as unknown as AuditService);
const status = (p: Promise<unknown>) =>
  p.then(() => 'ok', (e: { getStatus?: () => number; getResponse?: () => unknown }) => [e.getStatus?.(), e.getResponse?.()]);
const OFF = [409, { code: 'template_sync_off', message: 'template_sync_off' }];

describe('TemplateRegistry with WA_TEMPLATE_SYNC=false (docs/12 §13.9)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.configured.mockReturnValue(true);
    queries.get.mockResolvedValue(RENEWAL_DUE_SEED);
    vi.stubEnv('WA_TEMPLATE_SYNC', 'false');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('boot: no timer, so no getTemplates call', async () => {
    vi.useFakeTimers();
    registry().onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(client.getTemplates).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('verifyAll and submit answer 409 template_sync_off before ANY other check or client call', async () => {
    client.configured.mockReturnValue(false);
    queries.get.mockResolvedValue(null);
    expect(await status(registry().verifyAll())).toEqual(OFF);
    expect(await status(registry().submit('nope', ADMIN.id))).toEqual(OFF);
    expect(await status(registry().moveLine({ key: 'nope', line: 'chat' }, ADMIN.id))).toEqual(OFF);
    expect(client.configured).not.toHaveBeenCalled();
    expect(queries.get).not.toHaveBeenCalled();
    expect(client.getTemplates).not.toHaveBeenCalled();
    expect(chatClient.getTemplates).not.toHaveBeenCalled();
    expect(client.submitTemplate).not.toHaveBeenCalled();
    expect(queries.update).not.toHaveBeenCalled();
  });

  it('default (unset or blank) keeps today: the boot check runs, verifyAll reaches Meta', async () => {
    vi.stubEnv('WA_TEMPLATE_SYNC', '');
    client.getTemplates.mockResolvedValue([]);
    queries.all.mockResolvedValue([]);
    vi.useFakeTimers();
    registry().onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.getTemplates).toHaveBeenCalledTimes(1);
    await expect(registry().verifyAll()).resolves.toMatchObject({ templates: [] });
  });
});

describe('POST /messaging/templates/* with WA_TEMPLATE_SYNC=false', () => {
  let t: Awaited<ReturnType<typeof whatsappApp>>;
  beforeAll(async () => {
    t = await whatsappApp();
  });
  afterAll(() => t.app.close());
  afterEach(() => vi.unstubAllEnvs());

  it('health and submit answer 409 template_sync_off; the client is never called', async () => {
    vi.resetAllMocks();
    t.client.configured.mockReturnValue(true);
    vi.stubEnv('WA_TEMPLATE_SYNC', 'false');
    for (const url of ['/messaging/templates/health', '/messaging/templates/renewal_due/submit']) {
      const res = await t.call({ method: 'POST', url });
      expect([res.statusCode, res.json().code]).toEqual([409, 'template_sync_off']);
    }
    expect(t.client.getTemplates).not.toHaveBeenCalled();
    expect(t.client.submitTemplate).not.toHaveBeenCalled();
  });
});
