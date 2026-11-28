import { describe, expect, it, vi } from 'vitest';
import { replyConfirm } from './reply-confirm';

const ID = 'a1000000-0000-4000-8000-000000000003';
const MOVED = { id: ID, starts_at: '2099-10-04T14:00:00.000Z', status: 'confirmed' };

function confirmWith(answer: unknown) {
  const apiSend = vi.fn().mockResolvedValue(answer);
  return { apiSend, confirm: replyConfirm({ apiFetch: vi.fn(), apiSend }) };
}

describe('replyConfirm', () => {
  it('sales confirms on the sales lesson route and gets the moved lesson', async () => {
    const { apiSend, confirm } = confirmWith(MOVED);
    await expect(confirm({ lessonId: ID, route: 'sales' })).resolves.toEqual(MOVED);
    expect(apiSend).toHaveBeenCalledWith('POST', `/sales/lessons/${ID}/confirm`, undefined);
  });

  it('an admin confirms on the lesson route, whose answer is the full lesson view', async () => {
    const { apiSend, confirm } = confirmWith(MOVED);
    await expect(confirm({ lessonId: ID, route: 'admin' })).rejects.toThrow();
    expect(apiSend).toHaveBeenCalledWith('POST', `/lessons/${ID}/confirm`, undefined);
  });

  it('refuses a sales answer that is not the moved lesson', async () => {
    const { confirm } = confirmWith({ id: 'l-1', status: 'confirmed' });
    await expect(confirm({ lessonId: ID, route: 'sales' })).rejects.toThrow();
  });
});
