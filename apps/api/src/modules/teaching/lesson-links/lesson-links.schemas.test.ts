import { describe, expect, it } from 'vitest';
import { linkRouteSchema } from './lesson-links.schemas';

describe('linkRouteSchema', () => {
  it('names the two public link routes', () => {
    expect(linkRouteSchema.options).toEqual(['join', 'legacy']);
  });
});
