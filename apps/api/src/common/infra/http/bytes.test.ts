import { describe, expect, it } from 'vitest';
import { readCapped } from './bytes';
import { Passthrough } from './failure';
import { brokenBody, streaming } from './http.fakes';

const tooLarge = (): Error => new Error('too large');

describe('readCapped', () => {
  it('joins the chunks in order', async () => {
    const res = new Response(new Uint8Array([1, 2, 3]));
    expect(Array.from(await readCapped(res.body, 10, tooLarge))).toEqual([1, 2, 3]);
  });

  it('an empty body is zero bytes', async () => {
    expect((await readCapped(null, 10, tooLarge)).byteLength).toBe(0);
  });

  it('stops the stream the moment it passes the cap', async () => {
    const res = streaming(100, 4);
    const read = readCapped(res.body, 10, tooLarge);
    await expect(read).rejects.toBeInstanceOf(Passthrough);
    await expect(read).rejects.toMatchObject({ error: { message: 'too large' } });
  });

  it('exactly the cap is fine', async () => {
    expect((await readCapped(streaming(2, 5).body, 10, tooLarge)).byteLength).toBe(10);
  });

  it('a broken stream rejects with its error', async () => {
    await expect(readCapped(brokenBody().body, 10, tooLarge)).rejects.toThrow('socket hang up');
  });
});
