import { describe, expect, it } from 'vitest';
import {
  configDescriptionSchema, configEntryPatchSchema, DESCRIPTION_MAX, needsTypedConfirm, typedConfirmMatches,
} from './entries.js';

describe('needsTypedConfirm (data-deleting values, docs/26 §8 q3)', () => {
  it('asks when the deleting starts (from OFF) or gets earlier', () => {
    expect(needsTypedConfirm('typed', 30, null)).toBe(true);
    expect(needsTypedConfirm('typed', 30, 60)).toBe(true);
  });

  it('does not ask when the period gets longer, stays, or turns off', () => {
    expect(needsTypedConfirm('typed', 60, 30)).toBe(false);
    expect(needsTypedConfirm('typed', 30, 30)).toBe(false);
    expect(needsTypedConfirm('typed', null, 30)).toBe(false);
  });

  it('never asks for a plain or absent confirmation', () => {
    expect(needsTypedConfirm('simple', 1, null)).toBe(false);
    expect(needsTypedConfirm(null, 1, null)).toBe(false);
  });
});

describe('typedConfirmMatches', () => {
  it('accepts the number of days, trimmed, on any keypad', () => {
    expect(typedConfirmMatches(30, ' 30 ')).toBe(true);
    expect(typedConfirmMatches(30, '٣٠')).toBe(true);
    expect(typedConfirmMatches(30, '۳۰')).toBe(true);
  });

  it('refuses another number, words or nothing', () => {
    expect(typedConfirmMatches(30, '3')).toBe(false);
    expect(typedConfirmMatches(30, 'نعم')).toBe(false);
    expect(typedConfirmMatches(30, undefined)).toBe(false);
  });
});

describe('entry bodies', () => {
  it('a value patch needs a whole, non-negative expected version; null is a value', () => {
    expect(configEntryPatchSchema.safeParse({ value: null, expectedVersion: 0 }).success).toBe(true);
    expect(configEntryPatchSchema.safeParse({ value: 1, expectedVersion: -1 }).success).toBe(false);
    expect(configEntryPatchSchema.safeParse({ value: 1, expectedVersion: 1.5 }).success).toBe(false);
    expect(configEntryPatchSchema.safeParse({ value: 1 }).success).toBe(false);
  });

  it('a description is 1..500 characters after trimming, or null to restore', () => {
    expect(configDescriptionSchema.parse({ text: '  وصف  ' })).toEqual({ text: 'وصف' });
    expect(configDescriptionSchema.parse({ text: null })).toEqual({ text: null });
    expect(configDescriptionSchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(configDescriptionSchema.safeParse({ text: 'x'.repeat(DESCRIPTION_MAX + 1) }).success).toBe(false);
  });
});
