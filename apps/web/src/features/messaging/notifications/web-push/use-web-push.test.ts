import { describe, expect, it } from 'vitest';
import { webPushView } from './use-web-push';

describe('webPushView', () => {
  it('the browser decides first', () => {
    for (const support of ['unsupported', 'ios-install', 'denied'] as const) {
      expect(webPushView({ support, publicKey: 'k', subscribed: true })).toBe(support);
    }
  });

  it('then the server key: null = not configured, unknown yet = loading', () => {
    expect(webPushView({ support: 'ready', publicKey: null, subscribed: false })).toBe('not-configured');
    expect(webPushView({ support: 'ready', publicKey: undefined, subscribed: false })).toBe('loading');
  });

  it('then this browser: loading until the subscription is read, then on / off', () => {
    expect(webPushView({ support: 'ready', publicKey: 'k', subscribed: null })).toBe('loading');
    expect(webPushView({ support: 'ready', publicKey: 'k', subscribed: true })).toBe('on');
    expect(webPushView({ support: 'ready', publicKey: 'k', subscribed: false })).toBe('off');
  });
});
