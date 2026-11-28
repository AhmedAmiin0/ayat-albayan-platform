import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmReplyLesson } from './reply-confirm-api';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const LESSON = 'a1000000-0000-4000-8000-000000000001';
const MOVED = { id: LESSON, starts_at: '2099-10-04T14:00:00.000Z', status: 'confirmed' };

afterEach(() => apiSend.mockReset());

describe('confirmReplyLesson', () => {
  it('sales confirms through the sales lesson route and gets its strict answer', async () => {
    apiSend.mockResolvedValue(MOVED);
    await expect(confirmReplyLesson({ lessonId: LESSON, route: 'sales' })).resolves.toEqual(MOVED);
    expect(apiSend).toHaveBeenCalledWith('POST', `/sales/lessons/${LESSON}/confirm`, undefined);
  });

  it('an admin confirms through the lesson route', async () => {
    apiSend.mockResolvedValue({});
    await expect(confirmReplyLesson({ lessonId: LESSON, route: 'admin' })).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON}/confirm`, undefined);
  });

  it('refuses a sales answer that is not the moved lesson', async () => {
    apiSend.mockResolvedValue({ id: 'l-1', status: 'confirmed' });
    await expect(confirmReplyLesson({ lessonId: LESSON, route: 'sales' })).rejects.toThrow();
  });
});
