import { describe, expect, it } from 'vitest';
import { targetOf } from './share-grant.controller';

const ID = '0c000000-0000-4000-8000-000000000001';

// docs/36 z2b: a bad id is the 400 envelope (checked first); a bad identity stays 404.
describe('targetOf', () => {
  it('returns the id and the identity', () => {
    expect(targetOf({ id: ID, identity: 'guest-0123456789ab' })).toEqual({
      id: ID,
      identity: 'guest-0123456789ab',
    });
  });

  it('a bad id is the invalid_uuid envelope, before the identity is looked at', () => {
    expect(() => targetOf({ id: 'nope', identity: 'bad' })).toThrow(
      expect.objectContaining({
        response: { message: 'validation_failed', issues: [{ path: 'id', message: 'invalid_uuid' }] },
      }),
    );
  });

  it('a bad identity is 404 participant_not_found', () => {
    expect(() => targetOf({ id: ID, identity: 'bad' })).toThrow('participant_not_found');
  });
});
