import { afterEach, describe, expect, it } from 'vitest';
import { integrationOverlay, setIntegrationOverlay } from './integration-overlay';

afterEach(() => setIntegrationOverlay({}));

describe('integration overlay: the database snapshot loadEnv() lays over process.env', () => {
  it('starts empty', () => {
    expect(integrationOverlay()).toEqual({});
    expect(Object.isFrozen(integrationOverlay())).toBe(true);
  });

  it('stores a frozen copy: changing the input afterwards changes nothing', () => {
    const input: Record<string, string> = { WA_API_VERSION: 'v22.0' };
    setIntegrationOverlay(input);
    input.WA_API_VERSION = 'v1.0';
    input.FX_API_URL = 'https://fx.example.test';
    expect(integrationOverlay()).toEqual({ WA_API_VERSION: 'v22.0' });
    expect(Object.isFrozen(integrationOverlay())).toBe(true);
  });

  it('a second set replaces the snapshot, it does not merge', () => {
    setIntegrationOverlay({ WA_API_VERSION: 'v22.0', LIVEKIT_URL: 'wss://lk.example.test' });
    setIntegrationOverlay({ FX_API_URL: 'https://fx.example.test' });
    expect(integrationOverlay()).toEqual({ FX_API_URL: 'https://fx.example.test' });
  });
});
