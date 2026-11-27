import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { studentRecordingsApi } from '..';

const STUDENT = '00000000-0000-4000-8000-000000000001';
const RECORDING = '00000000-0000-4000-8000-000000000002';
const view = {
  id: RECORDING, lesson_id: 'L', lesson_starts_at: 'a', started_at: 'a', teacher: null,
  status: 'done', duration_seconds: 60, size_bytes: 1, media: 'audio',
  visible_to_student: false, can_manage: true, url: 'https://x.test/r',
};
const page = { items: [view], total: 1, page: 1, pageSize: 10 };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('studentRecordingsApi (R-REC)', () => {
  it('reads a page with the filters, leaving out the empty ones', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 10, from: '2026-10-05', to: '', status: 'done' } as const;
    const out = await studentRecordingsApi(client).list({ studentId: STUDENT, query });
    expect(apiFetch).toHaveBeenCalledWith(
      `/students/${STUDENT}/recordings?page=2&pageSize=10&from=2026-10-05&status=done`,
    );
    expect(out.items[0]?.media).toBe('audio');
  });

  it('reads the recorded lesson ids', async () => {
    const { client, apiFetch } = clientAnswering(['L1', 'L2']);
    await expect(studentRecordingsApi(client).recordedLessonIds(STUDENT)).resolves
      .toEqual(['L1', 'L2']);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${STUDENT}/recorded-lesson-ids`);
  });

  it('patches the visibility and parses the answer', async () => {
    const { client, apiSend } = clientAnswering({ id: RECORDING, visible_to_student: true });
    const out = await studentRecordingsApi(client).setVisible({ id: RECORDING, visible: true });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/recordings/${RECORDING}/visibility`, {
      visible: true,
    });
    expect(out.visible_to_student).toBe(true);
  });

  it('deletes with no body and no answer', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(studentRecordingsApi(client).remove(RECORDING)).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenCalledWith('DELETE', `/recordings/${RECORDING}`, undefined);
  });

  it('throws bad_response on a recording in an unknown state', async () => {
    const { client } = clientAnswering({ ...page, items: [{ ...view, status: 'lost' }] });
    const failure = await studentRecordingsApi(client)
      .list({ studentId: STUDENT, query: {} })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
