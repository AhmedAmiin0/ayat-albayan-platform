import { describe, expect, it } from 'vitest';
import { CLIENT_HEADER } from '../index.js';

describe('@ab/client-core skeleton', () => {
  it('exposes the http entry through the package index', () => {
    expect(CLIENT_HEADER).toBe('X-AB-Client');
  });
});
