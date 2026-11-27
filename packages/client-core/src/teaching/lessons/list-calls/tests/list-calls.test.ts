import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { lessonListCalls } from '..';

const FROM = '2026-10-03T21:00:00.000Z';
const TO = '2026-10-10T21:00:00.000Z';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async (_path: string) => answer);
  const apiSend = vi.fn(async (_m: string, _path: string, _body?: unknown) => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch };
};

describe('lessonListCalls (R-SCH-01, R-SCH-09)', () => {
  it('reads the week window with its teacher filter', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await expect(lessonListCalls(client).list({ from: FROM, to: TO })).resolves.toEqual([]);
    const path = apiFetch.mock.calls[0]?.[0] ?? '';
    expect(path.split('?')[0]).toBe('/lessons');
    expect(Object.fromEntries(new URLSearchParams(path.split('?')[1]))).toEqual({ from: FROM, to: TO });
  });

  it('reads one local day in its zone, the zone encoded', async () => {
    const { client, apiFetch } = clientAnswering([]);
    await lessonListCalls(client).day({ date: '2026-10-04', tz: 'Asia/Riyadh' });
    expect(apiFetch).toHaveBeenCalledWith('/lessons/day?date=2026-10-04&tz=Asia%2FRiyadh');
  });

  it('refuses a list answer that is not lesson views', async () => {
    const { client } = clientAnswering([{ id: 'x' }]);
    await expect(lessonListCalls(client).day({ date: '2026-10-04' })).rejects.toThrow();
  });

  it('reads the overview and refuses one without its teachers', async () => {
    const overview = { from: FROM, to: TO, teachers: [], lessons: [] };
    const { client, apiFetch } = clientAnswering(overview);
    await expect(lessonListCalls(client).overview({ from: FROM, to: TO })).resolves.toEqual(
      overview,
    );
    expect(apiFetch.mock.calls[0]?.[0]?.startsWith('/lessons/overview?')).toBe(true);
    const bad = clientAnswering({ from: FROM, to: TO, lessons: [] });
    await expect(lessonListCalls(bad.client).overview({ from: FROM, to: TO })).rejects.toThrow();
  });
});
