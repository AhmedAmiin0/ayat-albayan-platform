import { afterEach, describe, expect, it } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { evolutionOff } from './evolution-pace';

// docs/19: only a session row pinned to an Evolution number that cannot send counts as «off».

const num = (over: Partial<OverlayNumber>) =>
  ({ id: 'n1', purpose: 'chat', enabled: true, env: null, ...over }) as unknown as OverlayNumber;
const row = { number_id: 'n1', template_key: null };
const overlay = (n: OverlayNumber) =>
  setNumbersOverlay({ values: {}, numberIds: {}, numbers: [n] });

describe('evolutionOff', () => {
  afterEach(() => setNumbersOverlay(null));

  it('an Evolution number switched off is off', () => {
    overlay(num({ evolution: true, enabled: false }));
    expect(evolutionOff(row)).toBe(true);
  });

  it('an enabled number without a working config is a gap to fix, not a reason to fail rows', () => {
    overlay(num({ evolution: true }));
    expect(evolutionOff(row)).toBe(false);
  });

  it('never for another driver, a template row, an unknown number or legacy mode', () => {
    expect(evolutionOff(row)).toBe(false);
    overlay(num({ enabled: false }));
    expect(evolutionOff(row)).toBe(false);
    overlay(num({ evolution: true, enabled: false }));
    expect(evolutionOff({ number_id: 'n1', template_key: 'booking_confirmation' })).toBe(false);
    expect(evolutionOff({ number_id: 'n2', template_key: null })).toBe(false);
  });
});
