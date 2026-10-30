import { describe, expect, it } from 'vitest';
import { avatarInitials } from './avatar-initials.js';

describe('avatarInitials (owner 2026-10-28)', () => {
  it('an Arabic name gives its first letter, without a leading «ال»', () => {
    expect(avatarInitials('هدى علي أحمد')).toBe('ه');
    expect(avatarInitials('الحسن علي')).toBe('ح');
    expect(avatarInitials('  العنود ')).toBe('ع');
    expect(avatarInitials('ال')).toBe('ا');
  });

  it('keeps hamza forms as typed', () => {
    expect(avatarInitials('أحمد')).toBe('أ');
    expect(avatarInitials('إيمان')).toBe('إ');
    expect(avatarInitials('آمنة')).toBe('آ');
  });

  it('a Latin name gives up to two upper-cased initials', () => {
    expect(avatarInitials('sara ahmed khan')).toBe('SA');
    expect(avatarInitials('Sara')).toBe('S');
  });

  it('empty, emoji-only or a bare number gives nothing; an emoji word is skipped', () => {
    expect(avatarInitials('')).toBe('');
    expect(avatarInitials('   ')).toBe('');
    expect(avatarInitials('🌙✨')).toBe('');
    expect(avatarInitials('+966 50 123')).toBe('');
    expect(avatarInitials('🌙 Sara Ali')).toBe('SA');
    expect(avatarInitials('🌙 مريم')).toBe('م');
  });
});
