import { describe, expect, it } from 'vitest';
import {
  gateScreen, goneScreen, isDeadEnd, openTarget, outcomeScreen, type GateState,
} from './gate-screen';
import { gateView } from './short-links.test-util';

const view = { kind: 'view', view: gateView } as const;
const gone = (goneReason: 'expired' | 'revoked' | null) =>
  ({ kind: 'view', view: { ...gateView, state: 'gone', goneReason } }) as const;
const base: GateState = { view, signedIn: false, step: 'start', result: null };

describe('gateScreen', () => {
  it('waits for the view, then says not found', () => {
    expect(gateScreen({ ...base, view: undefined })).toBe('loading');
    expect(gateScreen({ ...base, view: { kind: 'not_found' } })).toBe('not_found');
  });

  it('shows why a gone link is gone before anything else', () => {
    expect(gateScreen({ ...base, view: gone('revoked'), signedIn: true })).toBe('revoked');
    expect(gateScreen({ ...base, view: gone('expired') })).toBe('expired');
    expect(gateScreen({ ...base, view: gone(null) })).toBe('expired');
  });

  it('offers «متابعة باسم» to a signed-in visitor, the phone step otherwise', () => {
    expect(gateScreen({ ...base, signedIn: true })).toBe('signed_in');
    expect(gateScreen(base)).toBe('phone');
    expect(gateScreen({ ...base, signedIn: true, step: 'phone' })).toBe('phone');
    expect(gateScreen({ ...base, step: 'code' })).toBe('code');
  });

  it('follows the last answer', () => {
    const at = (result: GateState['result']) => gateScreen({ ...base, step: 'code', result });
    expect(at({ outcome: 'open', target: 'https://x.test' })).toBe('opening');
    expect(at({ outcome: 'not_allowed' })).toBe('restricted');
    expect(at({ outcome: 'limit_reached' })).toBe('full');
    expect(at({ outcome: 'gone' })).toBe('expired');
  });
});

describe('outcomes', () => {
  it('reads gone from the view, expired by default', () => {
    expect(outcomeScreen({ outcome: 'gone' }, gone('revoked').view)).toBe('revoked');
    expect(outcomeScreen({ outcome: 'gone' }, null)).toBe('expired');
    expect(goneScreen(null)).toBe('expired');
  });

  it('gives the target only when open', () => {
    expect(openTarget({ outcome: 'open', target: 'https://x.test' })).toBe('https://x.test');
    expect(openTarget({ outcome: 'limit_reached' })).toBeNull();
    expect(openTarget(null)).toBeNull();
  });

  it('never gives a target that is not http(s)', () => {
    expect(openTarget({ outcome: 'open', target: 'javascript:alert(1)' })).toBeNull();
    expect(openTarget({ outcome: 'open', target: 'data:text/html,x' })).toBeNull();
    expect(openTarget({ outcome: 'open', target: 'not a url' })).toBeNull();
    expect(openTarget({ outcome: 'open', target: 'http://x.test/a' })).toBe('http://x.test/a');
  });

  it('turns an open answer with an unsafe target into a dead end', () => {
    const unsafe = { outcome: 'open', target: 'javascript:alert(1)' } as const;
    expect(outcomeScreen(unsafe, null)).toBe('not_found');
    expect(gateScreen({ ...base, step: 'code', result: unsafe })).toBe('not_found');
    expect(isDeadEnd(outcomeScreen(unsafe, null))).toBe(true);
  });

  it('marks the screens with nothing left to do', () => {
    expect(isDeadEnd('full')).toBe(true);
    expect(isDeadEnd('not_found')).toBe(true);
    expect(isDeadEnd('restricted')).toBe(false);
    expect(isDeadEnd('phone')).toBe(false);
  });
});
