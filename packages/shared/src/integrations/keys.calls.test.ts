import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { integrationDef } from './keys.js';

describe('voice-call ICE keys (docs/28)', () => {
  it('STUN / TURN urls and the username are plain; the TURN password is a Vault secret', () => {
    expect(integrationDef('CALLS_STUN_URLS')).toMatchObject({ group: 'calls', secret: false });
    expect(integrationDef('CALLS_TURN_URLS')).toMatchObject({ group: 'calls', secret: false });
    expect(integrationDef('CALLS_TURN_USERNAME')).toMatchObject({ group: 'calls', secret: false });
    expect(integrationDef('CALLS_TURN_CREDENTIAL')).toMatchObject({ group: 'calls', secret: true });
  });

  it('accepts comma-separated stun: / turn: / turns: urls only', () => {
    expect(integrationValueValid('CALLS_STUN_URLS', 'stun:stun.example.org:3478')).toBe(true);
    expect(integrationValueValid('CALLS_STUN_URLS', 'stun:a.example.org, stun:b.example.org:19302')).toBe(true);
    expect(integrationValueValid('CALLS_TURN_URLS', 'turns:turn.example.org:5349?transport=tcp')).toBe(true);
    expect(integrationValueValid('CALLS_TURN_URLS', 'https://turn.example.org')).toBe(false);
    expect(integrationValueValid('CALLS_STUN_URLS', 'stun:')).toBe(false);
  });
});
