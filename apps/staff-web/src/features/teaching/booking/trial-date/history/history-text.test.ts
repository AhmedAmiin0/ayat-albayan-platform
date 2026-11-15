import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { rowTexts } from './history-text';
import { row } from '@/features/teaching/booking/trial-date/trial-fixture';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;
/** The viewer's zone the suite reads in (the academy's). */
const V = 'Asia/Riyadh';

describe('rowTexts («مواعيد الحلقة التجريبية» row)', () => {
  it('reads Riyadh time, with no family line in the same zone', () => {
    const text = rowTexts({ row: row(), familyTz: 'Asia/Riyadh', viewerTz: V }, C24);
    expect(text.when).toContain('17:00');
    expect(text.family).toBeNull();
    expect(text.picked).toBe(t.trialDate.pickedAt.replace('{name}', 'سارة').replace('{when}', '1 أكتوبر 2026'));
  });

  it('adds the family’s clock when their zone differs', () => {
    const text = rowTexts({ row: row(), familyTz: 'Europe/London', viewerTz: V }, C24);
    expect(text.family).toBe(t.trialDate.familyTime.replace('{time}', 'الاثنين 5 أكتوبر 15:00'));
  });

  it('no family line for another zone on the same clock (Kuwait, or Cairo in summer time)', () => {
    expect(rowTexts({ row: row(), familyTz: 'Asia/Kuwait', viewerTz: V }, C24).family).toBeNull();
    expect(rowTexts({ row: row(), familyTz: 'Africa/Cairo', viewerTz: V }, C24).family).toBeNull();
  });

  it('names an unknown picker for an imported row', () => {
    const imported = rowTexts({ row: row({ picked_by: null }), familyTz: 'Asia/Riyadh', viewerTz: V }, C24);
    expect(imported.picked).toContain(t.trialDate.unknownPicker);
  });

  it('compares with the viewer zone it is given: a London viewer gets the Riyadh family line', () => {
    expect(rowTexts({ row: row(), familyTz: 'Asia/Riyadh', viewerTz: 'Europe/London' }, C24).family).not.toBeNull();
  });
});
