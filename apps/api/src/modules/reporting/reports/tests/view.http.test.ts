import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REPORT_ID, reportRow } from './reports.fakes';
import { reportsApp } from './test-app';

const URL = `/reports/${REPORT_ID}`;

describe('GET /reports/:id answers its schema (R4)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('answers the report view', async () => {
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: REPORT_ID, status: 'draft', form_version: 1 });
  });

  it('a stored row the schema refuses is a 500 response_invalid, never the row', async () => {
    h.reports.get.mockResolvedValue(reportRow({ version: -1 }));
    const res = await h.call({ method: 'GET', url: URL });
    expect(res.statusCode).toBe(500);
    expect(res.json().code).toBe('response_invalid');
  });

  it('a report id that is not a uuid is refused at the edge', async () => {
    expect((await h.call({ method: 'GET', url: '/reports/nope' })).statusCode).toBe(400);
  });
});
