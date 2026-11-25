import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SUMMARY_HEADER } from './state.ts';
import { AUTH, fileList, json, read, useStub } from './test-server.ts';

const stub = useStub();

describe('google-stub drive and sheets', () => {
  it('finds the seeded root folder and summary sheet by Drive query, appends and reads values', async () => {
    const q = (s: string) => `${stub.base()}/drive/v3/files?q=${encodeURIComponent(s)}`;
    const roots = await read(
      fetch(
        q(
          "name = 'تقارير آيات البيان' and trashed = false and mimeType = 'application/vnd.google-apps.folder'",
        ),
        { headers: AUTH },
      ),
      fileList,
    );
    expect(roots.files).toHaveLength(1);
    const sheets = await read(
      fetch(q(`name = 'سجل الطلاب المشتركين' and '${roots.files[0]?.id ?? ''}' in parents`), {
        headers: AUTH,
      }),
      fileList,
    );
    const id = sheets.files[0]?.id ?? '';
    const app = await read(
      fetch(
        `${stub.base()}/v4/spreadsheets/${id}/values/A1:append`,
        json({ values: [['طالب', 'T']] }),
      ),
      z.object({ updates: z.object({ updatedRange: z.string() }) }),
    );
    expect(app.updates.updatedRange).toBe('Sheet1!A2:M2');
    const got = await read(
      fetch(`${stub.base()}/v4/spreadsheets/${id}/values/${encodeURIComponent('A2:H')}`, {
        headers: AUTH,
      }),
      z.object({ values: z.array(z.array(z.unknown())) }),
    );
    expect(got.values).toEqual([['طالب', 'T']]);
  });

  it('uploads a multipart PDF with its appProperties and lists it in /__stub/state', async () => {
    const boundary = 'b1';
    const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: 'r.pdf', parents: ['p'], appProperties: { ab_source: 'platform' } })}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--${boundary}--`;
    const res = await fetch(`${stub.base()}/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: { ...AUTH, 'content-type': `multipart/related; boundary=${boundary}` },
      body,
    });
    expect(res.status).toBe(200);
    const state = await read(
      fetch(`${stub.base()}/__stub/state`),
      z.object({
        files: z.array(
          z.object({ name: z.string(), appProperties: z.record(z.string(), z.string()) }),
        ),
      }),
    );
    expect(state.files.find((f) => f.name === 'r.pdf')?.appProperties).toEqual({
      ab_source: 'platform',
    });
  });

  it('reads A1 ranges: one cell, a sheet prefix, an open row end and a bad end cell', async () => {
    const values = async (range: string): Promise<unknown> => {
      const sheet = 'stubSummary00000000000002';
      const url = `${stub.base()}/v4/spreadsheets/${sheet}/values/${encodeURIComponent(range)}`;
      return (await fetch(url, { headers: AUTH })).json();
    };
    expect(await values('B1')).toEqual({ values: [SUMMARY_HEADER.slice(1, 2)] });
    expect(await values('Sheet1!A1:B')).toEqual({ values: [SUMMARY_HEADER.slice(0, 2)] });
    expect(await values('C1:')).toEqual({ values: [SUMMARY_HEADER.slice(2, 3)] });
    expect(await values('B1:x')).toEqual({ values: [SUMMARY_HEADER.slice(1)] });
  });
});
