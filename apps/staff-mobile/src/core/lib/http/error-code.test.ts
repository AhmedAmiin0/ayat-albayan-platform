import { ApiError } from '@ab/mobile-kit';
import { errorCode } from './error-code';

const apiError = (body: unknown) => new ApiError(409, body);

test('reads the code of an API refusal', () => {
  expect(errorCode(apiError({ code: 'crm_no_media' }))).toBe('crm_no_media');
});

test('no code for a body without a string code, or for another error', () => {
  expect(errorCode(apiError({ code: 7 }))).toBeUndefined();
  expect(errorCode(apiError('oops'))).toBeUndefined();
  expect(errorCode(apiError(null))).toBeUndefined();
  expect(errorCode(new Error('x'))).toBeUndefined();
});
