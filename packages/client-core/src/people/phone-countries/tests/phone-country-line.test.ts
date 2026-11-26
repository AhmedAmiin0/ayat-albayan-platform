import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { phoneCountryLine } from '../phone-country-line';

const inArabic = (phone: string) => phoneCountryLine(phone, { lang: 'ar', words: ar.inbox.quote });
const inEnglish = (phone: string) => phoneCountryLine(phone, { lang: 'en', words: en.inbox.quote });

describe('phoneCountryLine — the sheet line that says where the chat number is from', () => {
  it('one country: its flag, its name in the UI language and the code', () => {
    expect(inArabic('+201000000005')).toBe('دولة العميل حسب الرقم: 🇪🇬 مصر (+20)');
    expect(inEnglish('+201000000005')).toBe("Client's country by number: 🇪🇬 Egypt (+20)");
    expect(inArabic('+966501234567')).toBe('دولة العميل حسب الرقم: 🇸🇦 السعودية (+966)');
  });

  it('a country the site does not price is named all the same', () => {
    expect(inArabic('+923001234567')).toBe('دولة العميل حسب الرقم: 🇵🇰 باكستان (+92)');
    expect(inEnglish('+2348031234567')).toBe("Client's country by number: 🇳🇬 Nigeria (+234)");
  });

  it('a code two or three countries share: their names joined, no flag', () => {
    expect(inArabic('+77010000000')).toBe('دولة العميل حسب الرقم: كازاخستان أو روسيا (+7)');
    expect(inEnglish('+77010000000')).toBe("Client's country by number: Kazakhstan or Russia (+7)");
    expect(inEnglish('+12025550123')).toBe(
      "Client's country by number: Canada or U.S. Outlying Islands or United States (+1)",
    );
    expect(inArabic('+12025550123')).toBe(
      'دولة العميل حسب الرقم: كندا أو جزر الولايات المتحدة الصغيرة النائية أو الولايات المتحدة (+1)',
    );
  });

  it('a code more than three countries share names the first three in list order', () => {
    expect(inArabic('+447700900123')).toBe(
      'دولة العميل حسب الرقم: المملكة المتحدة أو غيرنزي أو جزيرة مان (+44)',
    );
    expect(inEnglish('+447700900123')).toBe(
      "Client's country by number: United Kingdom or Guernsey or Isle of Man (+44)",
    );
  });

  it('a longer code is its own country, not the shared shorter one', () => {
    expect(inEnglish('+12685550101')).toBe(
      "Client's country by number: 🇦🇬 Antigua and Barbuda (+1268)",
    );
  });

  it.each(['+99912345678', '', 'abc', '+20', '201000000005'])('%j shows nothing', (phone) => {
    expect(inArabic(phone)).toBeNull();
    expect(inEnglish(phone)).toBeNull();
  });

  it('wraps the code only, so each app can isolate it in a right-to-left line', () => {
    const wrap = (code: string) => `<${code}>`;
    const line = (phone: string) =>
      phoneCountryLine(phone, { lang: 'en', words: en.inbox.quote, wrap });
    expect(line('+201000000005')).toBe("Client's country by number: 🇪🇬 Egypt (<+20>)");
    expect(line('+77010000000')).toBe("Client's country by number: Kazakhstan or Russia (<+7>)");
  });

  it('fills the slots wherever the label puts them', () => {
    const words = { ...en.inbox.quote, clientCountry: '{code}: {country}' };
    expect(phoneCountryLine('+201000000005', { lang: 'en', words })).toBe('+20: 🇪🇬 Egypt');
  });
});
