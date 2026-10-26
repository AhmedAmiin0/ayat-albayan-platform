import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { plainYes, typedMatches, typedTitle } from './ConfirmValueDialog';

const v = t.settingsValues;

describe('the confirmation words', () => {
  it('the typed number may use Arabic-Indic digits', () => {
    expect(typedMatches('٣٠', 30)).toBe(true);
    expect(typedMatches(' 30 ', 30)).toBe(true);
    expect(typedMatches('۳۰', 30)).toBe(true);
    expect(typedMatches('3', 30)).toBe(false);
    expect(typedMatches('', 30)).toBe(false);
  });

  it('the typed title counts the days in the right form', () => {
    expect(typedTitle(3)).toBe(v.confirm.typedTitleCount.replace('{count}', v.units.days.few.replace('{n}', '3')));
    expect(typedTitle(1)).toBe(v.confirm.typedTitleCount.replace('{count}', v.units.days.one));
    expect(typedTitle(30)).toBe(v.confirm.typedTitleCount.replace('{count}', v.units.days.other.replace('{n}', '30')));
  });

  it('a switch’s yes button names what it does, on and off', () => {
    expect(plainYes('teachers_always_available', true)).toBe(v.confirmYes.teachersAlwaysAvailable.on);
    expect(plainYes('meeting_link_auto', false)).toBe(v.confirmYes.meetingLinkAuto.off);
    expect(plainYes('sales_auto_assign', true)).toBe(v.confirmYes.salesAutoAssign.on);
    expect(plainYes('fx_fresh_hours', 6)).toBe(v.confirm.plainYes);
  });
});
