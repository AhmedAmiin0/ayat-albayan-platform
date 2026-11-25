import { describe, expect, it } from 'vitest';
import {
  shortCodeSchema,
  shortLinkCreateSchema,
  shortLinkListQuerySchema,
  shortLinkOtpVerifySchema,
  shortLinkUpdateSchema,
} from './short-links';

const base = { title: ' رابط التسجيل ', targetUrl: 'https://app.example.com/register' };

describe('managed short link bodies (docs/19)', () => {
  it('create: defaults (anyone, unlimited, no WhatsApp, no users), title trimmed', () => {
    expect(shortLinkCreateSchema.parse(base)).toEqual({
      title: 'رابط التسجيل',
      targetUrl: base.targetUrl,
      maxUsers: null,
      audience: 'anyone',
      profileIds: [],
      phones: [],
      sendWhatsapp: false,
    });
  });

  it('create: https only; phones E.164 any country; a listed or WhatsApp link needs users', () => {
    expect(shortLinkCreateSchema.safeParse({ ...base, targetUrl: 'http://x.com' }).success).toBe(
      false,
    );
    expect(shortLinkCreateSchema.parse({ ...base, phones: ['+44 7700 900123'] }).phones).toEqual([
      '+447700900123',
    ]);
    expect(shortLinkCreateSchema.safeParse({ ...base, audience: 'listed' }).success).toBe(false);
    expect(shortLinkCreateSchema.safeParse({ ...base, sendWhatsapp: true }).success).toBe(false);
    expect(shortLinkCreateSchema.safeParse({ ...base, maxUsers: 0 }).success).toBe(false);
  });

  it('update: at least one field; list query coerces paging', () => {
    expect(shortLinkUpdateSchema.safeParse({}).success).toBe(false);
    expect(shortLinkUpdateSchema.parse({ maxUsers: null })).toEqual({ maxUsers: null });
    expect(shortLinkListQuerySchema.parse({ page: '2' })).toEqual({ page: 2, pageSize: 20 });
  });

  it('the gate: a code is base62, an OTP folds Arabic digits', () => {
    expect(shortCodeSchema.safeParse('Ab12Cd34Ef').success).toBe(true);
    expect(shortCodeSchema.safeParse('../etc').success).toBe(false);
    const v = shortLinkOtpVerifySchema.parse({ phone: '+201000000001', code: '١٢٣ ٤٥٦' });
    expect(v.code).toBe('123456');
  });
});
