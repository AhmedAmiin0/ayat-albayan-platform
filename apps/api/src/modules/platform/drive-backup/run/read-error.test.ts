import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { fromSource, soloWhy, SourceReadError } from './read-error';

async function* cut(): AsyncGenerator<Uint8Array> {
  yield Buffer.from('a');
  await Promise.resolve();
  throw new Error('ECONNRESET');
}

describe('a big object’s failure: MinIO or not', () => {
  it('a body that fails mid-read becomes a SourceReadError (the cause kept)', async () => {
    const seen: string[] = [];
    const read = async () => {
      for await (const c of fromSource(cut())) seen.push(Buffer.from(c).toString());
    };
    const err = await read().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SourceReadError);
    expect(err).toMatchObject({ message: 'ECONNRESET' });
    expect(seen).toEqual(['a']);
  });

  it.each([
    [new SourceReadError('object_cut_off'), 'read_failed'],
    [new SourceReadError('object_size_changed'), 'read_failed'],
    [new GoogleApiError(500, 'backendError'), 'upload_failed'],
    [new Error('state write failed'), 'upload_failed'],
  ])('%s → %s', (e, why) => {
    expect(soloWhy(e)).toBe(why);
  });
});
