import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dbError, errorCode, errorMessage } from './db-error.ts';

const pgError = () =>
  Object.assign(new Error('course_mismatch'), {
    code: 'P0001',
    detail: 'stale',
    constraint_name: 'teachers_meeting_mode_check',
  });

test('dbError reads the postgres fields of a rejected query', () => {
  assert.deepEqual(dbError(pgError()), {
    code: 'P0001',
    message: 'course_mismatch',
    detail: 'stale',
    constraint_name: 'teachers_meeting_mode_check',
  });
});

test('errorCode and errorMessage pick one field', () => {
  assert.equal(errorCode(pgError()), 'P0001');
  assert.equal(errorMessage(pgError()), 'course_mismatch');
});

test('a plain error has a message and no code', () => {
  assert.equal(errorCode(new TypeError('x')), undefined);
  assert.equal(errorMessage(new TypeError('x')), 'x');
});

test('a thrown value that is not an error reads as an empty error', () => {
  assert.deepEqual(dbError('boom'), {});
  assert.deepEqual(dbError(null), {});
  assert.equal(errorCode(undefined), undefined);
});

test('a field of the wrong type reads as an empty error', () => {
  assert.deepEqual(dbError({ code: 42501 }), {});
});
