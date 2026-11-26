import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { sendParts } from '../../../..';

const schema = z.object({ id: z.string() });

describe('sendParts', () => {
  it('splits `{ body, schema }` options', () => {
    expect(sendParts({ body: { amount: 1 }, schema })).toEqual({ body: { amount: 1 }, schema });
  });

  it('takes `{ schema }` alone as a write with no body', () => {
    expect(sendParts({ schema })).toEqual({ schema });
  });

  it('keeps a plain JSON body as the body, even one with a schema-like key', () => {
    expect(sendParts({ reason: 'x' })).toEqual({ body: { reason: 'x' } });
    expect(sendParts({ schema: 'json' })).toEqual({ body: { schema: 'json' } });
    expect(sendParts(undefined)).toEqual({ body: undefined });
  });
});
