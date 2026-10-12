import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { APP_ENV, RECORDED_UPLOAD, RENEWAL_DUE_SEED, REPORT_READY_SEED } from './seed-templates.fakes';
import { SAMPLE_REPORT } from './template-review';
import { TemplateRegistry } from './template.registry';
import type { TemplatesQueries } from './templates.queries';
import { HttpWhatsappClient } from './whatsapp.client';
import { RECORDED, scriptedFetch, STUB_ENV } from './whatsapp.fakes';
import type { TemplateRow } from './whatsapp.types';

// The admin's submit end to end: the real registry and HttpWhatsappClient over a fetch that
// answers what tools/wa-stub answered (seed-templates.fakes.ts); only the DB and audit are mocks.

const queries = { get: vi.fn(), update: vi.fn() };
const audit = { record: vi.fn() };
type Reply = Parameters<typeof scriptedFetch>[number];

function submit(row: TemplateRow, env: typeof STUB_ENV, ...replies: Reply[]) {
  queries.get.mockResolvedValue(row);
  const f = scriptedFetch(...replies);
  const client = new HttpWhatsappClient(env, { fetch: f.fetch, timeoutMs: 1_000 });
  const lines = { notifications: client, chat: new HttpWhatsappClient(null) };
  const registry = new TemplateRegistry(queries as unknown as TemplatesQueries, lines, audit as unknown as AuditService);
  const result = registry.submit(row.key, 'admin-1').then(
    (view) => ({ view, error: null }),
    (e: { getStatus: () => number; getResponse: () => unknown }) => ({ view: null, error: [e.getStatus(), e.getResponse()] }),
  );
  return { result, requests: f.requests };
}

describe('POST /messaging/templates/:key/submit with a document header (report_ready)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.update.mockImplementation(async (_key: string, patch: object) => ({ ...REPORT_READY_SEED, ...patch }));
  });

  it('uploads the sample PDF, then creates the template with its handle: pending, meta id, audited', async () => {
    const { result, requests } = submit(REPORT_READY_SEED, APP_ENV, RECORDED_UPLOAD.session, RECORDED_UPLOAD.handle, RECORDED_UPLOAD.createDoc);
    const { view, error } = await result;
    expect(error).toBeNull();
    expect(requests.map((r) => r.url.replace('http://127.0.0.1:4010/v21.0/', ''))).toEqual([
      `stub-app/uploads?file_name=lesson-report-sample.pdf&file_length=${SAMPLE_REPORT.bytes.byteLength}&file_type=application%2Fpdf`,
      'upload:8343d89e280548838554f260de294898?sig=stub277cd412',
      'stub-waba/message_templates',
    ]);
    expect(requests[1]?.init.body).toBe(SAMPLE_REPORT.bytes);
    expect(requests[2]?.body).toMatchObject({
      name: 'report_ready',
      category: 'UTILITY',
      components: [{ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [RECORDED_UPLOAD.handle.body.h] } }, { type: 'BODY' }, { type: 'FOOTER' }],
    });
    expect(queries.update).toHaveBeenCalledWith('report_ready', expect.objectContaining({ status: 'pending', meta_id: RECORDED_UPLOAD.createDoc.body.id }));
    expect(view?.status).toBe('pending');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'template_submitted', after: expect.objectContaining({ key: 'report_ready' }) }));
  });

  it('without WA_APP_ID: 409 needs_app_id and nothing reaches Meta', async () => {
    const { result, requests } = submit(REPORT_READY_SEED, STUB_ENV);
    expect((await result).error).toEqual([409, { code: 'needs_app_id', message: 'needs_app_id' }]);
    expect(requests).toHaveLength(0);
    expect(queries.update).not.toHaveBeenCalled();
  });

  it('a failed upload is 502 meta_error and the template is never created', async () => {
    const { result, requests } = submit(REPORT_READY_SEED, APP_ENV, RECORDED_UPLOAD.session, RECORDED.badToken);
    expect((await result).error).toEqual([502, expect.objectContaining({ code: 'meta_error', meta_code: 190 })]);
    expect(requests).toHaveLength(2);
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('a text template is unchanged: one create call, no upload, no header (with or without WA_APP_ID)', async () => {
    for (const env of [APP_ENV, STUB_ENV]) {
      const { result, requests } = submit(RENEWAL_DUE_SEED, env, RECORDED.createTemplate);
      expect((await result).error).toBeNull();
      expect(requests.map((r) => r.url)).toEqual(['http://127.0.0.1:4010/v21.0/stub-waba/message_templates']);
      expect((requests[0]?.body as { components: { type: string }[] }).components.map((c) => c.type)).toEqual(['BODY', 'FOOTER']);
    }
  });

  it('a body Meta would reject is 409 invalid_template before any call', async () => {
    const bad = { ...RENEWAL_DUE_SEED, body_ar: 'باقة {{1}}: {{2}}', params: ['student_name', 'remaining_label'] };
    const { result, requests } = submit(bad, APP_ENV);
    expect((await result).error).toEqual([409, { code: 'invalid_template', message: 'invalid_template', reason: 'a variable at the start or end of the body' }]);
    expect(requests).toHaveLength(0);
  });
});
