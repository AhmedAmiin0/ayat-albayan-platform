import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { notFound } from '@/common/http/errors';
import {
  pageFacts,
  pageRow,
  PUBLIC_ID,
  REPORT_ID,
} from '@/modules/reporting/report-page/report-page.fakes';
import type { ReportPageService } from '@/modules/reporting/report-page/report-page.service';
import { ReportCodeService } from './report-code.service';

const OTHER = '00000000-0000-4000-8000-0000000000f2';
const NOW = new Date('2026-11-06T12:00:00Z');
const tooMany = () =>
  new HttpException({ code: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);

function setup(opts: { pepper?: string | null; rowId?: string } = {}) {
  const row = pageRow({ id: opts.rowId ?? REPORT_ID });
  const pages = {
    find: vi.fn(async () => ({ row, facts: pageFacts() })),
    view: vi.fn(async () => ({ ok: true })),
  };
  const pepper = opts.pepper === undefined ? 'test-pepper' : opts.pepper;
  const codes = {
    issue: vi.fn(async () => true),
    check: vi.fn(async () => true),
    sendable: vi.fn(async () => pepper !== null),
    limit: vi.fn(async () => undefined),
    pepper: () => pepper,
  };
  const limits = { assert: codes.limit };
  const svc = new ReportCodeService(pages as unknown as ReportPageService, codes);
  return { svc, pages, codes, limits };
}
const call = { publicId: PUBLIC_ID, ip: '203.0.113.9' };
const cookieOf = (setCookie: string) => setCookie.split(';')[0] ?? '';

describe("ReportCodeService — the report page's WhatsApp code", () => {
  it('a code goes to the phone ON FILE of the chosen target, bound to this report', async () => {
    const { svc, codes, limits } = setup();
    await svc.request({ ...call, to: 'teacher' });
    expect(limits.assert).toHaveBeenCalledWith('request', {
      ip: call.ip,
      identifier: `report:${PUBLIC_ID}`,
    });
    expect(codes.issue).toHaveBeenCalledWith({ reportId: REPORT_ID, phone: '+15550000002' });
  });

  it("a right code: a cookie for this report's routes that opens the page", async () => {
    const { svc, codes, pages } = setup();
    const set = await svc.verify({ ...call, code: '123456' }, NOW);
    expect(codes.check).toHaveBeenCalledWith({ reportId: REPORT_ID, code: '123456' }, NOW);
    expect(set).toContain(`Path=/public/report-pages/${PUBLIC_ID};`);
    await svc.view({ publicId: PUBLIC_ID, cookie: cookieOf(set) }, NOW);
    expect(pages.view).toHaveBeenCalledTimes(1);
  });

  it('a wrong or expired code (CodeIssuer says no): 401 invalid_code, no cookie', async () => {
    const { svc, codes } = setup();
    codes.check.mockResolvedValue(false);
    await expect(svc.verify({ ...call, code: '000000' }, NOW)).rejects.toMatchObject({
      response: { code: 'invalid_code' },
    });
  });

  it('over the limits: 429 before any code is checked or sent', async () => {
    const { svc, codes, limits } = setup();
    limits.assert.mockRejectedValue(tooMany());
    await expect(svc.verify({ ...call, code: '123456' }, NOW)).rejects.toMatchObject({
      status: 429,
    });
    await expect(svc.request({ ...call, to: 'family' })).rejects.toMatchObject({ status: 429 });
    expect(codes.check).not.toHaveBeenCalled();
    expect(codes.issue).not.toHaveBeenCalled();
  });

  it("another report's cookie, an expired one or none: 401 code_required", async () => {
    const a = setup();
    const set = await a.svc.verify({ ...call, code: '123456' }, NOW);
    const b = setup({ rowId: OTHER });
    await expect(
      b.svc.view({ publicId: PUBLIC_ID, cookie: cookieOf(set) }, NOW),
    ).rejects.toMatchObject({
      response: { code: 'code_required' },
    });
    const late = new Date(NOW.getTime() + 31 * 60_000);
    await expect(
      a.svc.view({ publicId: PUBLIC_ID, cookie: cookieOf(set) }, late),
    ).rejects.toMatchObject({ status: 401 });
    await expect(a.svc.view({ publicId: PUBLIC_ID, cookie: undefined }, NOW)).rejects.toMatchObject(
      { status: 401 },
    );
    expect(b.pages.view).not.toHaveBeenCalled();
  });

  it('no pepper: no code checked, no page; codes unavailable on request (503)', async () => {
    const { svc, codes } = setup({ pepper: null });
    await expect(svc.verify({ ...call, code: '123456' }, NOW)).rejects.toMatchObject({
      status: 401,
    });
    await expect(svc.request({ ...call, to: 'family' })).rejects.toMatchObject({ status: 503 });
    expect(codes.check).not.toHaveBeenCalled();
    expect((await svc.access(PUBLIC_ID)).available).toBe(false);
  });

  it('a report not yet sent to the family: no family code, the session URLs last 30 min', async () => {
    const { svc, codes, pages } = setup();
    pages.find.mockResolvedValue({ row: pageRow({ sent_at: null }), facts: pageFacts() });
    expect((await svc.access(PUBLIC_ID)).to.map((c) => c.to)).toEqual(['teacher']);
    await svc.request({ ...call, to: 'family' });
    expect(codes.issue).not.toHaveBeenCalled();
    const set = await svc.verify({ ...call, code: '123456' }, NOW);
    await svc.view({ publicId: PUBLIC_ID, cookie: cookieOf(set) }, NOW);
    expect(pages.view).toHaveBeenCalledWith(expect.anything(), 1800);
  });

  it('an unknown or draft report: 404 at every step', async () => {
    const { svc, pages } = setup();
    pages.find.mockRejectedValue(notFound('report_not_found'));
    await expect(svc.access(PUBLIC_ID)).rejects.toMatchObject({ status: 404 });
    await expect(svc.request({ ...call, to: 'family' })).rejects.toMatchObject({ status: 404 });
  });

  it('access: the masked numbers only, never a full phone', async () => {
    const { svc } = setup();
    const view = await svc.access(PUBLIC_ID);
    expect(view).toEqual({
      available: true,
      to: [
        { to: 'family', masked: '••••01' },
        { to: 'teacher', masked: '••••02' },
      ],
    });
    expect(JSON.stringify(view)).not.toContain('+1555');
  });
});
