import { describe, expect, it } from 'vitest';
import { callsKeys } from '../calls.keys';

describe('callsKeys', () => {
  it('keys every read under the /calls path, as the realtime nudge expects', () => {
    expect(callsKeys.all).toEqual(['calls']);
    expect(callsKeys.config).toEqual(['calls', 'config']);
    expect(callsKeys.active).toEqual(['calls', 'active']);
    expect(callsKeys.permission('+966501234567')).toEqual(['calls', 'permission', '+966501234567']);
  });

  it('keys one chat of the log by its number and the whole log as all', () => {
    expect(callsKeys.list('+966501234567')).toEqual(['calls', 'list', '+966501234567']);
    expect(callsKeys.list(null)).toEqual(['calls', 'list', 'all']);
  });
});
