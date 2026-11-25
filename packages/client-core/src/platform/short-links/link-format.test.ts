import { describe, expect, it } from 'vitest';
import {
  bareUrl, isFull, linkState, linkStateLook, sendCounts, sendLook, targetHost, usageParts,
  usageText,
} from './link-format';
import { detail } from './short-links.test-util';

const words = { usedOf: '{used} من {max}', usedUnlimited: '{used} · بلا حد' };

describe('link state', () => {
  it('adds «اكتمل العدد» to an active link at its limit', () => {
    expect(linkState({ status: 'active', maxUsers: 5, visitors: 5 })).toBe('full');
    expect(linkState({ status: 'active', maxUsers: null, visitors: 50 })).toBe('active');
    expect(linkState({ status: 'expired', maxUsers: 5, visitors: 5 })).toBe('expired');
    expect(linkStateLook(detail)).toEqual({ key: 'active', tone: 'success', glyph: 'fill' });
    expect(isFull({ maxUsers: 2, visitors: 1 })).toBe(false);
  });

  it('shows expired amber and hollow, revoked grey and struck (the boards)', () => {
    const look = (status: 'expired' | 'revoked') =>
      linkStateLook({ status, maxUsers: null, visitors: 0 });
    expect(look('expired')).toEqual({ key: 'expired', tone: 'warning', glyph: 'hollow' });
    expect(look('revoked')).toEqual({ key: 'revoked', tone: 'neutral', glyph: 'struck' });
    expect(linkStateLook({ status: 'active', maxUsers: 1, visitors: 1 })).toEqual({
      key: 'full', tone: 'warning', glyph: 'half',
    });
  });
});

describe('send state', () => {
  it('looks and counts', () => {
    expect(sendLook('failed')).toEqual({ key: 'failed', tone: 'danger', glyph: 'struck' });
    expect(sendLook('queued').glyph).toBe('fill');
    expect(sendLook('not_sent').tone).toBe('neutral');
    expect(sendCounts(detail.userList)).toEqual({ queued: 1, failed: 1, not_sent: 0 });
  });
});

describe('usage', () => {
  it('writes «7 من 12» or «23 · بلا حد»', () => {
    expect(usageText({ maxUsers: 12, visitors: 7 }, words)).toBe('7 من 12');
    expect(usageText({ maxUsers: null, visitors: 23 }, words)).toBe('23 · بلا حد');
    expect(usageParts({ maxUsers: 5, visitors: 5 })).toEqual({ used: 5, max: 5, full: true });
  });
});

describe('urls', () => {
  it('shows the short URL bare and the target host', () => {
    expect(bareUrl(detail.shortUrl)).toBe('app.ayatalbayan.com/l/K7q2M9xT');
    expect(targetHost(detail.targetUrl)).toBe('meet.google.com');
    expect(targetHost('not a url')).toBe('not a url');
  });
});
