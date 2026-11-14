import { describe, expect, it } from 'vitest';
import { editLimitReason, editRoute, nextEditAt, recentEdits } from './edit-limits.js';

const now = new Date('2026-11-14T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe('Meta edit limits', () => {
  it('lets an approved template be edited once a day', () => {
    expect(editLimitReason({ status: 'approved', edits: [], now })).toBeNull();
    expect(editLimitReason({ status: 'approved', edits: [hoursAgo(23)], now })).toBe('edit_daily_limit');
    expect(editLimitReason({ status: 'approved', edits: [hoursAgo(25)], now })).toBeNull();
  });

  it('caps an approved template at 10 edits in 30 days', () => {
    const ten = Array.from({ length: 10 }, (_, i) => hoursAgo(48 + i * 24));
    expect(editLimitReason({ status: 'approved', edits: ten, now })).toBe('edit_monthly_limit');
    expect(editLimitReason({ status: 'approved', edits: ten.slice(1), now })).toBeNull();
  });

  it('never counts a rejected or paused template', () => {
    const many = Array.from({ length: 12 }, () => hoursAgo(1));
    expect(editLimitReason({ status: 'rejected', edits: many, now })).toBeNull();
    expect(editLimitReason({ status: 'paused', edits: many, now })).toBeNull();
  });

  it('says when the next edit opens', () => {
    expect(nextEditAt({ status: 'approved', edits: [], now })).toBeNull();
    expect(nextEditAt({ status: 'approved', edits: [hoursAgo(20)], now })).toBe(hoursAgo(-4));
  });

  it('keeps only the last 30 days', () => {
    expect(recentEdits([hoursAgo(24 * 31), hoursAgo(2)], now)).toEqual([hoursAgo(2)]);
  });

  it('edits on Meta only what Meta lets one edit; a never-sent row is ours', () => {
    expect(editRoute('approved')).toBe('meta');
    expect(editRoute('rejected')).toBe('meta');
    expect(editRoute('paused')).toBe('meta');
    expect(editRoute('not_submitted')).toBe('local');
    expect(editRoute('pending')).toBeNull();
    expect(editRoute('disabled')).toBeNull();
  });
});
