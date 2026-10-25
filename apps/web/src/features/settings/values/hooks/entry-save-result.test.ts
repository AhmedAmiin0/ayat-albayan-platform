import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { isConflict, saveFailure } from './entry-save-result';

const CONFLICT = { code: 'conflict', key: 'fx_fresh_hours', current: 12, version: 5, updatedAt: null, updatedByName: null };
const plain = { mine: 6, typed: false };

describe('saveFailure (PATCH /config/entries/:key refused)', () => {
  it('409 conflict: the row waits for a choice and keeps «قيمتك»', () => {
    expect(saveFailure(new ApiError(409, CONFLICT), plain)).toEqual({ status: { state: 'conflict', conflict: CONFLICT, mine: 6 }, end: 'conflict' });
  });

  it('409 owned_by_module: moved', () => {
    expect(saveFailure(new ApiError(409, { code: 'owned_by_module' }), plain)).toEqual({ status: { state: 'moved' }, end: 'moved' });
  });

  it('428: ask for the typed text, unless it was sent (then it did not match: failed)', () => {
    const err = new ApiError(428, { code: 'confirmation_required', message: 'type 30' });
    expect(saveFailure(err, plain)).toEqual({ status: { state: 'idle' }, end: 'confirm' });
    expect(saveFailure(err, { mine: 30, typed: true })).toEqual({ status: { state: 'failed', message: 'type 30' }, end: 'failed' });
  });

  it('422, 404, a 409 without the facts and network errors are failed saves with the server words', () => {
    expect(saveFailure(new ApiError(422, { code: 'invalid', message: 'too big' }), plain)).toEqual({
      status: { state: 'failed', message: 'too big' },
      end: 'failed',
    });
    expect(saveFailure(new ApiError(404, { code: 'unknown_key' }), plain).end).toBe('failed');
    expect(saveFailure(new ApiError(409, { code: 'conflict' }), plain).end).toBe('failed');
    expect(saveFailure(new Error('offline'), plain)).toEqual({ status: { state: 'failed', message: undefined }, end: 'failed' });
  });

  it('isConflict needs the code, a numeric version and the current value', () => {
    expect(isConflict(CONFLICT)).toBe(true);
    expect(isConflict({ ...CONFLICT, version: '5' })).toBe(false);
    expect(isConflict(null)).toBe(false);
  });
});

describe('ownerRefused (PUT …/description)', () => {
  it('is the 403 owner_permission only', async () => {
    const { ownerRefused } = await import('../description/DescriptionEditor');
    expect(ownerRefused(new ApiError(403, { code: 'owner_permission' }))).toBe(true);
    expect(ownerRefused(new ApiError(403, { code: 'forbidden' }))).toBe(false);
    expect(ownerRefused(new Error('x'))).toBe(false);
  });
});
