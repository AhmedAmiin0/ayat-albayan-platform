import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { connectFailureText, isInsecureRoomUrl } from './connect-failure';

describe('connectFailureText', () => {
  it('ws:// on an https page is the server config (mixed content), whatever the error', () => {
    expect(isInsecureRoomUrl('ws://lk.example:7880', 'https:')).toBe(true);
    expect(isInsecureRoomUrl('wss://lk.example', 'https:')).toBe(false);
    expect(isInsecureRoomUrl('ws://localhost:7880', 'http:')).toBe(false);
    expect(connectFailureText({ url: 'ws://lk', error: new Error('x'), pageProtocol: 'https:' })).toBe(t.classroom.error.insecure_url);
  });

  it('an unreachable server says so; anything else stays the generic retry line', () => {
    const unreachable = { reasonName: 'ServerUnreachable' };
    expect(connectFailureText({ url: 'wss://lk', error: unreachable, pageProtocol: 'https:' })).toBe(t.classroom.error.server_unreachable);
    expect(connectFailureText({ url: 'wss://lk', error: { reasonName: 'Timeout' }, pageProtocol: 'https:' })).toBe(t.classroom.error.server_unreachable);
    expect(connectFailureText({ url: 'wss://lk', error: { reasonName: 'NotAllowed' }, pageProtocol: 'https:' })).toBe(t.classroom.error.connect_failed);
    expect(connectFailureText({ url: 'wss://lk', error: null, pageProtocol: 'https:' })).toBe(t.classroom.error.connect_failed);
  });
});
