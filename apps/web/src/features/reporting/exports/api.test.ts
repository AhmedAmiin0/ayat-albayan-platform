import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { downloadCsv, exportErrorCode, exportPath, filenameFrom } from './api';

vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/lib/http/env', () => ({ env: { apiUrl: 'http://api.test' } }));

describe('exports api (R-RPT-03)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the C1–C4 paths', () => {
    expect(exportPath({ kind: 'students' })).toBe('/exports/students.csv');
    expect(exportPath({ kind: 'lessons', params: { from: '2026-10-01', to: '2026-10-07' } })).toBe(
      '/exports/lessons.csv?from=2026-10-01&to=2026-10-07',
    );
    expect(exportPath({ kind: 'payouts', params: { month: '2026-09' } })).toBe('/exports/payouts.csv?month=2026-09');
  });

  it('takes the server file name, else <kind>.csv', () => {
    expect(filenameFrom('attachment; filename="payouts-2026-09.csv"', 'payouts')).toBe('payouts-2026-09.csv');
    expect(filenameFrom(null, 'students')).toBe('students.csv');
  });

  it('reads the API error code', () => {
    expect(exportErrorCode(new ApiError(400, { code: 'range_too_large' }))).toBe('range_too_large');
    expect(exportErrorCode(new ApiError(500, null))).toBeNull();
    expect(exportErrorCode(new Error('x'))).toBeNull();
  });

  it('downloads with the bearer token; a failed response throws the API error', async () => {
    const fetchMock = vi.fn(async () => new Response('﻿"a"\r\n', { headers: { 'Content-Disposition': 'attachment; filename="x.csv"' } }));
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await downloadCsv({ kind: 'students' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/exports/students.csv');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok');
    expect(new Headers(init.headers).get('X-AB-Client')).toBe('web/dev');
    expect(click).toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'invalid_month' }), { status: 400 }));
    await expect(downloadCsv({ kind: 'payouts', params: { month: 'x' } })).rejects.toBeInstanceOf(ApiError);
  });
});
