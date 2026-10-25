import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { rowTexts } from './history-text';
import { row } from './trial-fixture';

describe('rowTexts («مواعيد الحلقة التجريبية» row)', () => {
  it('reads Riyadh time, with no family line in the same zone', () => {
    const text = rowTexts({ row: row(), familyTz: 'Asia/Riyadh' });
    expect(text.when).toContain('17:00');
    expect(text.family).toBeNull();
    expect(text.picked).toBe(t.trialDate.pickedAt.replace('{name}', 'سارة').replace('{when}', '1 أكتوبر 2026'));
  });

  it('adds the family’s clock when their zone differs', () => {
    const text = rowTexts({ row: row(), familyTz: 'Europe/London' });
    expect(text.family).toBe(t.trialDate.familyTime.replace('{time}', 'الاثنين 5 أكتوبر 15:00'));
  });

  it('no family line for another zone on the same clock (Kuwait, or Cairo in summer time)', () => {
    expect(rowTexts({ row: row(), familyTz: 'Asia/Kuwait' }).family).toBeNull();
    expect(rowTexts({ row: row(), familyTz: 'Africa/Cairo' }).family).toBeNull();
  });

  it('names an unknown picker for an imported row', () => {
    expect(rowTexts({ row: row({ picked_by: null }), familyTz: 'Asia/Riyadh' }).picked).toContain(t.trialDate.unknownPicker);
  });
});
