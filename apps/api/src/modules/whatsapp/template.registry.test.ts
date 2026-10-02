import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { toMetaTemplate } from './meta-shapes';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { RECORDED, REPORT_READY, templateRow } from './whatsapp.fakes';
import { WaError, type WhatsappClient } from './whatsapp.types';

const queries = { all: vi.fn(), get: vi.fn(), update: vi.fn() };
const client = { configured: vi.fn(), getTemplates: vi.fn(), submitTemplate: vi.fn() };
const audit = { record: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const RENEWAL = templateRow({ key: 'renewal_due', meta_name: 'renewal_due', status: 'not_submitted', buttons: [] });
const recorded = RECORDED.templates.body.data.map((t) => toMetaTemplate({ ...t, components: [...t.components] }));

const registry = () =>
  new TemplateRegistry(queries as unknown as TemplatesQueries, client as unknown as WhatsappClient, audit as unknown as AuditService);
const status = (p: Promise<unknown>) => p.then(() => 'ok', (e: { getStatus?: () => number; getResponse?: () => unknown }) => [e.getStatus?.(), e.getResponse?.()]);

describe('TemplateRegistry (R-MSG-01, docs/12 §3.4)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.configured.mockReturnValue(true);
    client.getTemplates.mockResolvedValue(recorded);
    queries.all.mockResolvedValue([templateRow({ body_ar: 'شكل قديم' }), RENEWAL]);
    queries.update.mockImplementation(async (key: string, patch: object) => ({ ...templateRow({ key }), ...patch }));
    queries.get.mockResolvedValue(RENEWAL);
    client.submitTemplate.mockResolvedValue({ metaId: 'meta-9', status: 'PENDING' });
  });

  it('health: syncs every row from Meta’s list; a never-submitted one Meta lacks stays not_submitted', async () => {
    const views = await registry().verifyAll(NOW);
    expect(queries.update).toHaveBeenCalledWith('booking_confirmation', expect.objectContaining({ status: 'approved', body_ar: 'تم حجز حلقة {{1}} — {{2}}', quality: 'GREEN' }));
    expect(queries.update).toHaveBeenCalledWith('renewal_due', { last_checked_at: '2026-10-02T08:00:00.000Z', status: 'not_submitted' });
    expect(views.map((v) => [v.key, v.status])).toEqual([['booking_confirmation', 'approved'], ['renewal_due', 'not_submitted']]);
    expect(client.submitTemplate).not.toHaveBeenCalled();
  });

  it('health: 503 not_configured without WhatsApp env; 502 meta_error with Meta’s code on a Graph error', async () => {
    client.configured.mockReturnValue(false);
    expect(await status(registry().verifyAll())).toEqual([503, { code: 'not_configured', message: 'not_configured' }]);
    client.configured.mockReturnValue(true);
    client.getTemplates.mockRejectedValue(new WaError('(#190) Invalid OAuth access token', { code: 190, status: 401 }));
    expect(await status(registry().verifyAll())).toEqual([502, {
      code: 'meta_error', message: 'meta_error', meta_code: 190, meta_message: '(#190) Invalid OAuth access token',
    }]);
  });

  it('submit: creates on Meta, stores pending + meta id + submitted_at, audits it', async () => {
    const view = await registry().submit('renewal_due', 'admin-1');
    expect(client.submitTemplate).toHaveBeenCalledWith(RENEWAL);
    expect(queries.update).toHaveBeenCalledWith('renewal_due', expect.objectContaining({ status: 'pending', meta_id: 'meta-9', last_error: null }));
    expect(view.status).toBe('pending');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-1', entity: 'message_templates', action: 'template_submitted',
      after: { key: 'renewal_due', status: 'pending', meta_id: 'meta-9' },
    }));
  });

  it('submit guards, in order: 404, 409 not_submittable, 409 needs_manual_submit (document), 503, 502', async () => {
    queries.get.mockResolvedValueOnce(null);
    expect((await status(registry().submit('nope', 'a')))[0]).toBe(404);
    queries.get.mockResolvedValueOnce(templateRow());
    expect(await status(registry().submit('booking_confirmation', 'a'))).toEqual([409, { code: 'not_submittable', message: 'not_submittable', status: 'approved' }]);
    queries.get.mockResolvedValueOnce(REPORT_READY);
    expect(await status(registry().submit('report_ready', 'a'))).toEqual([409, { code: 'needs_manual_submit', message: 'needs_manual_submit' }]);
    client.configured.mockReturnValueOnce(false);
    expect((await status(registry().submit('renewal_due', 'a')))[0]).toBe(503);
    client.submitTemplate.mockRejectedValueOnce(new WaError('dup', { code: 100, status: 400, details: 'already exists' }));
    expect((await status(registry().submit('renewal_due', 'a')))[0]).toBe(502);
    expect(client.submitTemplate).toHaveBeenCalledTimes(1);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejected and missing templates can be submitted again', async () => {
    for (const s of ['rejected', 'missing'] as const) {
      queries.get.mockResolvedValueOnce({ ...RENEWAL, status: s });
      await expect(registry().submit('renewal_due', 'a')).resolves.toMatchObject({ status: 'pending' });
    }
  });

  it('approved(key): the view only when approved (B2’s template_not_approved)', async () => {
    queries.get.mockResolvedValueOnce(templateRow()).mockResolvedValueOnce(RENEWAL).mockResolvedValueOnce(null);
    await expect(registry().approved('booking_confirmation')).resolves.toMatchObject({ key: 'booking_confirmation' });
    await expect(registry().approved('renewal_due')).resolves.toBeNull();
    await expect(registry().approved('nope')).resolves.toBeNull();
  });

  it('boot: no check without WhatsApp; with it, a best-effort check that never throws and never submits', async () => {
    vi.useFakeTimers();
    try {
      client.configured.mockReturnValue(false);
      registry().onApplicationBootstrap();
      vi.advanceTimersByTime(10_000);
      expect(client.getTemplates).not.toHaveBeenCalled();
      client.configured.mockReturnValue(true);
      client.getTemplates.mockRejectedValue(new WaError('stub not up', { code: null, status: 0 }));
      const r = registry();
      r.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(client.getTemplates).toHaveBeenCalledTimes(1);
      r.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
    client.getTemplates.mockResolvedValue(recorded);
    await expect(registry().bootCheck()).resolves.toBeUndefined();
    expect(client.submitTemplate).not.toHaveBeenCalled();
  });
});
