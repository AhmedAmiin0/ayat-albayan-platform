import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approvedOn, setTemplateNumber, type NumberSetDeps } from './template-number-set';
import type { ApprovalRow, NumberRef } from './templates.queries';
import { templateRow } from './whatsapp.fakes';
import type { TemplateRow } from './whatsapp.types';

// PUT /messaging/templates/:key/number (docs/23c decisions 4, 9): the template's own number, audited, never blocked.

const SPARE = 'b0000000-0000-4000-8000-000000000002';
const DEFAULT: NumberRef = { id: 'b0000000-0000-4000-8000-000000000001', purpose: 'notifications', is_default: true, waba_id: 'w1' };
const spare: NumberRef = { id: SPARE, purpose: 'notifications', is_default: false, waba_id: 'w2' };
const approval = (over: Partial<ApprovalRow>): ApprovalRow => ({
  template_key: 'booking_confirmation', number_id: SPARE, status: 'approved', meta_id: null, quality: null,
  last_error: null, last_checked_at: null, updated_at: '2026-10-24T00:00:00Z', ...over,
});

let row: TemplateRow;
const queries = {
  get: vi.fn(async () => row),
  update: vi.fn(async (_key: string, patch: Partial<TemplateRow>) => ({ ...row, ...patch })),
  approvals: vi.fn(async (): Promise<ApprovalRow[]> => []),
  numberRef: vi.fn(async (id: string): Promise<NumberRef | null> => (id === SPARE ? spare : null)),
};
const audit = { record: vi.fn() };
const deps = { queries, audit } as unknown as NumberSetDeps;

describe('setTemplateNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    row = templateRow();
  });

  it('saves the number, audits it and warns when the number has not approved the template', async () => {
    const out = await setTemplateNumber(deps, { key: 'booking_confirmation', number_id: SPARE }, 'actor');
    expect(queries.update).toHaveBeenCalledWith('booking_confirmation', { number_id: SPARE });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'template_number_set', before: { key: 'booking_confirmation', number_id: null }, after: { key: 'booking_confirmation', number_id: SPARE },
    }));
    expect(out).toMatchObject({ template: { number_id: SPARE, numbers: [] }, not_approved_on_number: true });
  });

  it('no warning once the number holds an approved row; the view lists it', async () => {
    queries.approvals.mockResolvedValue([approval({})]);
    const out = await setTemplateNumber(deps, { key: 'booking_confirmation', number_id: SPARE }, 'actor');
    expect(out.not_approved_on_number).toBe(false);
    expect(out.template.numbers).toEqual([{ number_id: SPARE, status: 'approved', last_checked_at: null, last_error: null }]);
  });

  it('null goes back to the role default without a number lookup or a warning; the same value is a no-op', async () => {
    row = templateRow({ number_id: SPARE });
    expect((await setTemplateNumber(deps, { key: 'booking_confirmation', number_id: null }, 'a')).not_approved_on_number).toBe(false);
    expect(queries.numberRef).not.toHaveBeenCalled();
    vi.clearAllMocks();
    await setTemplateNumber(deps, { key: 'booking_confirmation', number_id: SPARE }, 'a');
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404 template_not_found and 404 unknown_number change nothing', async () => {
    await expect(setTemplateNumber(deps, { key: 'booking_confirmation', number_id: DEFAULT.id }, 'a')).rejects.toMatchObject({ status: 404, response: { code: 'unknown_number' } });
    queries.get.mockResolvedValueOnce(null as unknown as TemplateRow);
    await expect(setTemplateNumber(deps, { key: 'nope', number_id: null }, 'a')).rejects.toMatchObject({ status: 404 });
    expect(queries.update).not.toHaveBeenCalled();
  });
});

describe('approvedOn (decision 4)', () => {
  it('the role default with no row yet counts when the template is approved', () => {
    expect(approvedOn(templateRow(), DEFAULT, [])).toBe(true);
    expect(approvedOn(templateRow({ status: 'pending' }), DEFAULT, [])).toBe(false);
    expect(approvedOn(templateRow({ line: 'chat' }), DEFAULT, [])).toBe(false);
  });

  it('its own row wins; any other number needs one', () => {
    expect(approvedOn(templateRow(), DEFAULT, [approval({ number_id: DEFAULT.id, status: 'missing' })])).toBe(false);
    expect(approvedOn(templateRow(), spare, [])).toBe(false);
  });
});
