import { describe, expect, it } from 'vitest';
import {
  CHAT_LIST_NAME_MAX,
  chatListBodySchema,
  chatListNameKey,
  chatListNameSchema,
  chatListPhone,
  isChatListError,
} from './chat-lists.js';

describe('chatListNameSchema', () => {
  it('trims the name and keeps 1–30 characters', () => {
    expect(chatListNameSchema.parse('  بانتظار الدفع  ')).toBe('بانتظار الدفع');
    expect(chatListNameSchema.parse('ا'.repeat(CHAT_LIST_NAME_MAX))).toHaveLength(30);
  });

  it('refuses a blank name and a name over 30 characters', () => {
    expect(chatListNameSchema.safeParse('   ').success).toBe(false);
    expect(chatListNameSchema.safeParse('').success).toBe(false);
    expect(chatListNameSchema.safeParse('ب'.repeat(31)).success).toBe(false);
  });

  it('refuses a name that is only tashkeel or tatweel (its key would be empty)', () => {
    expect(chatListNameSchema.safeParse('ـــ').success).toBe(false);
    expect(chatListNameSchema.safeParse('َ').success).toBe(false);
  });

  it('is the body of create and rename', () => {
    expect(chatListBodySchema.parse({ name: ' عملاء جدد ' })).toEqual({ name: 'عملاء جدد' });
    expect(chatListBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('chatListNameKey', () => {
  it('matches Arabic letter variants, tashkeel, case and spaces', () => {
    expect(chatListNameKey('أولياء الأمور')).toBe(chatListNameKey('اولياء  الامور'));
    expect(chatListNameKey('دفعة')).toBe(chatListNameKey('دفعه'));
    expect(chatListNameKey('مُتابَعة')).toBe(chatListNameKey('متابعه'));
    expect(chatListNameKey('VIP')).toBe(chatListNameKey('vip'));
  });

  it('keeps different names apart', () => {
    expect(chatListNameKey('تجريبي')).not.toBe(chatListNameKey('مشترك'));
  });
});

describe('chatListPhone', () => {
  it('normalises a number to E.164', () => {
    expect(chatListPhone('+966501234567')).toBe('+966501234567');
    expect(chatListPhone('0501234567')).toBe('+966501234567');
  });

  it('keeps any E.164 chat number, a Saudi or Egyptian landline too', () => {
    expect(chatListPhone('+966112345678')).toBe('+966112345678');
    expect(chatListPhone(' +20223456789 ')).toBe('+20223456789');
  });

  it('refuses anything that is not a phone number', () => {
    expect(chatListPhone('abc')).toBeNull();
    expect(chatListPhone('+1')).toBeNull();
    expect(chatListPhone('')).toBeNull();
  });
});

describe('isChatListError', () => {
  it('knows the two 409 codes only', () => {
    expect(isChatListError('list_name_taken')).toBe(true);
    expect(isChatListError('list_limit')).toBe(true);
    expect(isChatListError('not_found')).toBe(false);
    expect(isChatListError(undefined)).toBe(false);
  });
});
