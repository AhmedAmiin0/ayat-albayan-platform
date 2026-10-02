// Home time zone of a person (rule 6: tz on every person). Pure.
import { normalizeArabic } from '@ab/shared';

// Calling code → zone. Single-zone countries only; longest prefix first.
const TZ_BY_CODE: readonly (readonly [string, string])[] = [
  ['+966', 'Asia/Riyadh'],
  ['+971', 'Asia/Dubai'],
  ['+974', 'Asia/Qatar'],
  ['+965', 'Asia/Kuwait'],
  ['+973', 'Asia/Bahrain'],
  ['+968', 'Asia/Muscat'],
  ['+962', 'Asia/Amman'],
  ['+964', 'Asia/Baghdad'],
  ['+967', 'Asia/Aden'],
  ['+970', 'Asia/Gaza'],
  ['+961', 'Asia/Beirut'],
  ['+963', 'Asia/Damascus'],
  ['+249', 'Africa/Khartoum'],
  ['+251', 'Africa/Addis_Ababa'],
  ['+252', 'Africa/Mogadishu'],
  ['+218', 'Africa/Tripoli'],
  ['+222', 'Africa/Nouakchott'],
  ['+212', 'Africa/Casablanca'],
  ['+213', 'Africa/Algiers'],
  ['+216', 'Africa/Tunis'],
  ['+358', 'Europe/Helsinki'],
  ['+20', 'Africa/Cairo'],
  ['+44', 'Europe/London'],
  ['+49', 'Europe/Berlin'],
  ['+48', 'Europe/Warsaw'],
  ['+90', 'Europe/Istanbul'],
  ['+33', 'Europe/Paris'],
  ['+31', 'Europe/Amsterdam'],
  ['+46', 'Europe/Stockholm'],
  ['+92', 'Asia/Karachi'],
];
export const DEFAULT_TZ = 'Asia/Riyadh';

/** Zone the number implies. Multi-zone or unlisted codes (+1, +7, +61 …) → the academy's zone. */
export function tzForPhone(e164: string): string {
  return TZ_BY_CODE.find(([code]) => e164.startsWith(code))?.[1] ?? DEFAULT_TZ;
}

// «الدولة / التوقيت اللي هتحضر بيه» (normalized): what the family declared beats the phone.
const TZ_BY_COUNTRY: Readonly<Record<string, string>> = {
  السعوديه: 'Asia/Riyadh',
  الكويت: 'Asia/Kuwait',
  الامارات: 'Asia/Dubai',
  قطر: 'Asia/Qatar',
  البحرين: 'Asia/Bahrain',
  عمان: 'Asia/Muscat',
  مصر: 'Africa/Cairo',
  الاردن: 'Asia/Amman',
  العراق: 'Asia/Baghdad',
  عراق: 'Asia/Baghdad',
};

/** tz of the declared country when it is a known one, else of the phone. */
export function personTz(o: { declared: string | null; phone: string }): string {
  const key = o.declared ? normalizeArabic(o.declared).trim() : '';
  return TZ_BY_COUNTRY[key] ?? tzForPhone(o.phone);
}
