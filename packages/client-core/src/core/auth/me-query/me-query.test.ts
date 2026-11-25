import { describe, expect, it, vi } from 'vitest';
import { meQueryOptions, pathKey } from '../../..';

describe('meQueryOptions', () => {
  it('keys GET /auth/me by its path, so an ["auth"] invalidation reaches it', () => {
    const options = meQueryOptions({ apiFetch: vi.fn() });
    expect(options.queryKey).toEqual(pathKey('/auth/me'));
  });

  it('reads /auth/me through the given client', async () => {
    const apiFetch = vi.fn().mockResolvedValue({ id: 'u1', role: 'admin' });
    await expect(meQueryOptions({ apiFetch }).queryFn()).resolves.toEqual({
      id: 'u1',
      role: 'admin',
    });
    expect(apiFetch).toHaveBeenCalledWith('/auth/me');
  });

  it('passes a refusal on', async () => {
    const apiFetch = vi.fn().mockRejectedValue(new Error('401'));
    await expect(meQueryOptions({ apiFetch }).queryFn()).rejects.toThrow('401');
  });
});
