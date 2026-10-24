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
    const text = rowTexts({ row: row(), familyTz: 'Africa/Cairo' });
    expect(text.family).toBe(t.trialDate.familyTime.replace('{time}', 'الاثنين 5 أكتوبر 17:00'));
  });

  it('names an unknown picker for an imported row', () => {
    expect(rowTexts({ row: row({ picked_by: null }), familyTz: 'Asia/Riyadh' }).picked).toContain(t.trialDate.unknownPicker);
  });
});
