import { describe, expect, it } from 'vitest';
import { avatarPath, BUCKETS, isPathOf } from './storage.paths';

// avatars/<user_id>/avatar-<ms>.<ext> (migration 20261012000370 parses the first segment; R-ACC-05).

describe('avatar path', () => {
  it('puts the photo in the user’s own folder with a timestamped name', () => {
    expect(BUCKETS.avatars).toBe('avatars');
    const path = avatarPath({ userId: 'u1', mime: 'image/webp', now: 1700000000000 });
    expect(path).toBe('u1/avatar-1700000000000.webp');
    expect(isPathOf(path, 'u1')).toBe(true);
    expect(isPathOf(path, 'u2')).toBe(false);
  });
});
