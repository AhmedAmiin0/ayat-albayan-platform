import { AVATAR_MAX_BYTES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { AVATAR_ACCEPT, avatarFileProblem, avatarSeed } from './avatar-file';

describe('avatarFileProblem (R-ACC-05, before any upload)', () => {
  it('accepts JPG, PNG and WebP up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(avatarFileProblem({ type, size: AVATAR_MAX_BYTES })).toBeNull();
  });

  it('refuses other types and larger files', () => {
    expect(avatarFileProblem({ type: 'image/gif', size: 10 })).toBe('avatar_type');
    expect(avatarFileProblem({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 })).toBe('avatar_too_large');
  });

  it('the file input accepts the same three types', () => {
    expect(AVATAR_ACCEPT).toBe('image/jpeg,image/png,image/webp');
  });
});

describe('avatarSeed (one tone per person)', () => {
  it("the linked teacher's id when there is one, else the profile id", () => {
    expect(avatarSeed({ id: 'u1', avatar_seed: 't1' })).toBe('t1');
    expect(avatarSeed({ id: 'u1' })).toBe('u1');
    expect(avatarSeed(undefined)).toBeUndefined();
  });
});
