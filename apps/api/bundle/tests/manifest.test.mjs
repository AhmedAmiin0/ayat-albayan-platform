import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestSchema, readManifest } from '../manifest.mjs';

describe('readManifest', () => {
  it('reads a workspace package.json through its schema', () => {
    const api = readManifest(join(import.meta.dirname, '../..'));
    expect(api.name).toBe('api');
    expect(api.dependencies['@ab/core']).toBe('workspace:*');
  });

  it('rejects a manifest whose export is neither a path nor a condition map', () => {
    expect(() => manifestSchema.parse({ name: 'x', exports: { '.': 1 } })).toThrow();
    expect(manifestSchema.parse({ name: 'x' }).dependencies).toEqual({});
  });
});
