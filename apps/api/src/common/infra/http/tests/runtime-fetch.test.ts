import { describe, expect, it } from 'vitest';
import { runtimeFetch } from '@/common/infra/http/http';

describe('runtimeFetch', () => {
  it('is the runtime fetch itself, read when the client loads', () => {
    expect(runtimeFetch).toBe(globalThis.fetch);
  });
});
