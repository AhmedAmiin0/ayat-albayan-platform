import { afterEach, describe, expect, it, vi } from 'vitest';
import { grantShareFor } from './share-api';

const apiSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch: vi.fn(), apiSend }));

const LESSON = '00000000-0000-4000-8000-000000000001';
const MEETING = '00000000-0000-4000-8000-000000000002';

describe('grantShareFor', () => {
  afterEach(() => apiSend.mockClear());

  it('posts {allow} to the lesson share route', async () => {
    await grantShareFor(`lesson-${LESSON}`)?.({ identity: 'guest-1', allow: true });
    const path = `/lessons/${LESSON}/room/participants/guest-1/share`;
    expect(apiSend).toHaveBeenLastCalledWith('POST', path, { allow: true });
  });

  it('posts {allow} to the meeting share route', async () => {
    await grantShareFor(`meeting-${MEETING}`)?.({ identity: 'guest-1', allow: false });
    const path = `/meetings/${MEETING}/participants/guest-1/share`;
    expect(apiSend).toHaveBeenLastCalledWith('POST', path, { allow: false });
  });

  it('has no share route for a room of neither kind', () => {
    expect(grantShareFor('other')).toBeNull();
  });
});
