import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { badRequest, conflict, notFound } from '../../../../common/http/errors';
import { A, ADMIN, assistantApp, ID, statementRow } from '../shared/assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;
const S = `/assistant-pay/statements`;

describe('monthly statements (admin): generate, approve, reopen, pay, unpay', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.statements.get.mockResolvedValue(statementRow());
    t.rpc.generate.mockResolvedValue(ID);
  });

  it('GET /statements: filters by assistant, month and status; the month is YYYY-MM', async () => {
    t.statements.list.mockResolvedValue([statementRow()]);
    const res = await t.call({ method: 'GET', url: `${S}?assistantId=${A}&month=2026-10&status=draft`, token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(t.statements.list).toHaveBeenCalledWith({ assistantId: A, month: '2026-10-01', status: 'draft' });
    for (const q of ['month=2026-13', 'status=nope', 'assistantId=1']) expect((await t.call({ method: 'GET', url: `${S}?${q}`, token: 'admin' })).statusCode).toBe(400);
  });

  it('the view: salary first, then commissions with the student, totals per currency; no receipt path, no actors', async () => {
    const res = await t.call({ method: 'GET', url: `${S}/${ID}`, token: 'admin' });
    const v = res.json();
    expect(v.lines.map((l: { kind: string }) => l.kind)).toEqual(['salary', 'commission']);
    expect(v.lines[1]).toMatchObject({ amount: 100, currency: 'SAR', student: { code: 'AB-1001', name: 'ياسمين' } });
    expect(v).toMatchObject({ id: ID, assistant: { id: A, name: 'الزهراء' }, month: '2026-10-01', status: 'draft', has_receipt: true });
    expect(res.body).not.toMatch(/secret\.pdf|approved_by|paid_by|created_by/);
  });

  it('POST /statements builds the draft of the month (idempotent) and returns it; the month must be valid', async () => {
    const res = await t.call({ method: 'POST', url: S, token: 'admin', body: { assistantId: A, month: '2026-10' } });
    expect(res.statusCode).toBe(200);
    expect(t.rpc.generate).toHaveBeenCalledWith({ assistantId: A, month: '2026-10-01', actorId: ADMIN });
    expect(res.json().id).toBe(ID);
    for (const body of [{ assistantId: A, month: '2026-10-01' }, { assistantId: A }, { month: '2026-10' }]) {
      expect((await t.call({ method: 'POST', url: S, token: 'admin', body })).statusCode).toBe(400);
    }
  });

  it('a frozen month answers 409 invalid_transition, an unknown assistant 404, as the RPC says', async () => {
    t.rpc.generate.mockRejectedValue(conflict('invalid_transition'));
    expect((await t.call({ method: 'POST', url: S, token: 'admin', body: { assistantId: A, month: '2026-10' } })).statusCode).toBe(409);
    t.rpc.generate.mockRejectedValue(notFound('assistant_not_found'));
    expect((await t.call({ method: 'POST', url: S, token: 'admin', body: { assistantId: A, month: '2026-10' } })).statusCode).toBe(404);
  });

  it('approve, reopen and unpay call one RPC each and return the statement; a repeat is 409, never a second move', async () => {
    for (const [action, fn, body] of [['approve', t.rpc.approve, undefined], ['reopen', t.rpc.reopen, undefined], ['unpay', t.rpc.unpay, { reason: 'تحويل خاطئ' }]] as const) {
      fn.mockResolvedValue(undefined);
      const res = await t.call({ method: 'POST', url: `${S}/${ID}/${action}`, token: 'admin', body });
      expect([action, res.statusCode, res.json().id]).toEqual([action, 200, ID]);
      fn.mockRejectedValue(conflict('invalid_transition'));
      expect([action, (await t.call({ method: 'POST', url: `${S}/${ID}/${action}`, token: 'admin', body })).statusCode]).toEqual([action, 409]);
    }
    expect(t.rpc.unpay).toHaveBeenCalledWith({ statementId: ID, actorId: ADMIN, reason: 'تحويل خاطئ' });
  });

  it('approve: an empty statement is 409 empty_statement; reopen refused while a reversal sits later is 409', async () => {
    t.rpc.approve.mockRejectedValue(conflict('empty_statement'));
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/approve`, token: 'admin' })).json().code).toBe('empty_statement');
    t.rpc.reopen.mockRejectedValue(conflict('reversal_in_later_statement'));
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/reopen`, token: 'admin' })).json().code).toBe('reversal_in_later_statement');
  });

  it('unpay needs a reason: 400 without one, nothing called', async () => {
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/unpay`, token: 'admin', body: {} })).statusCode).toBe(400);
    expect(t.rpc.unpay).not.toHaveBeenCalled();
  });

  it('pay: date, method and note go to the RPC; a receipt must be in the assistant folder (checked), else 400', async () => {
    t.rpc.pay.mockResolvedValue(undefined);
    const body = { paidAt: new Date(Date.now() - 86_400_000).toISOString(), method: 'bank', note: 'تحويل أكتوبر', receiptPath: `${A}/r.pdf` };
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/pay`, token: 'admin', body })).statusCode).toBe(200);
    expect(t.receipts.check).toHaveBeenCalledWith(A, `${A}/r.pdf`);
    expect(t.rpc.pay).toHaveBeenCalledWith({ statementId: ID, actorId: ADMIN, paid: { paidAt: body.paidAt, method: 'bank', note: body.note, receiptPath: body.receiptPath } });
    t.receipts.check.mockRejectedValue(badRequest('receipt_path'));
    vi.mocked(t.rpc.pay).mockClear();
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/pay`, token: 'admin', body })).json().code).toBe('receipt_path');
    expect(t.rpc.pay).not.toHaveBeenCalled();
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/pay`, token: 'admin', body: { method: 'crypto' } })).statusCode).toBe(400);
  });

  it('pay without a body defaults to now and no method; the same call twice is 409 the second time', async () => {
    t.rpc.pay.mockResolvedValueOnce(undefined).mockRejectedValueOnce(conflict('invalid_transition'));
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/pay`, token: 'admin', body: {} })).statusCode).toBe(200);
    expect(t.rpc.pay.mock.calls[0]?.[0].paid).toMatchObject({ method: null, note: null, receiptPath: null });
    expect((await t.call({ method: 'POST', url: `${S}/${ID}/pay`, token: 'admin', body: {} })).statusCode).toBe(409);
  });

  it('receipt: a signed download only when one was stored; an unknown statement is 404', async () => {
    t.receipts.download.mockResolvedValue({ url: 'https://signed', expiresAt: 'x' });
    expect((await t.call({ method: 'GET', url: `${S}/${ID}/receipt`, token: 'admin' })).statusCode).toBe(200);
    expect(t.receipts.download).toHaveBeenCalledWith('receipts/a/secret.pdf');
    t.statements.get.mockResolvedValue(null);
    expect((await t.call({ method: 'GET', url: `${S}/${ID}`, token: 'admin' })).json().code).toBe('statement_not_found');
  });

  it('receipt-upload-url: a signed PUT under the assistant folder; an unknown file type is 400', async () => {
    t.receipts.uploadUrl.mockResolvedValue({ url: 'https://put', path: `${A}/x.pdf` });
    const res = await t.call({ method: 'POST', url: '/assistant-pay/receipt-upload-url', token: 'admin', body: { assistantId: A, mime: 'application/pdf', size: 1000 } });
    expect(res.statusCode).toBe(200);
    expect(t.receipts.uploadUrl).toHaveBeenCalledWith(A, { mime: 'application/pdf', size: 1000 });
    expect((await t.call({ method: 'POST', url: '/assistant-pay/receipt-upload-url', token: 'admin', body: { assistantId: A, mime: 'text/html', size: 10 } })).statusCode).toBe(400);
  });
});
