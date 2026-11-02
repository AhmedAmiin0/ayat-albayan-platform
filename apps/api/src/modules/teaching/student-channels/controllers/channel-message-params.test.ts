import { describe, expect, it } from 'vitest';
import { messageParams } from './channel-message-params';

const S = '0c000000-0000-4000-8000-000000000001';
const M = '0c000000-0000-4000-8000-000000000002';
const bad = (path: string) => ({
  response: { message: 'validation_failed', issues: [{ path, message: 'invalid_uuid' }] },
});

// docs/36 z2b: both ids are GUIDs; a bad one is the 400 envelope, the student's checked first.
describe('messageParams', () => {
  it('reads the student id from the given key, then the message id', () => {
    expect(messageParams({ id: S, messageId: M }, 'id')).toEqual({ studentId: S, messageId: M });
    expect(messageParams({ studentId: S, messageId: M }, 'studentId')).toEqual({
      studentId: S,
      messageId: M,
    });
  });

  it('a bad student id fails before a bad message id', () => {
    expect(() => messageParams({ id: 'x', messageId: 'y' }, 'id')).toThrow(
      expect.objectContaining(bad('id')),
    );
    expect(() => messageParams({ id: S }, 'id')).toThrow(expect.objectContaining(bad('messageId')));
  });
});
