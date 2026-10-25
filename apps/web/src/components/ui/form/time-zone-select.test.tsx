import { TZ_OPTIONS } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TimeZoneSelect, tzCity } from './time-zone-select';

describe('TimeZoneSelect (rule 6)', () => {
  it('lists the curated zones by city with the id as an LTR island', () => {
    render(<TimeZoneSelect aria-label={t.students.tz} value="Africa/Cairo" onValue={vi.fn()} />);
    const select = screen.getByLabelText(t.students.tz) as HTMLSelectElement;
    expect(select.options).toHaveLength(TZ_OPTIONS.length);
    expect(select.selectedOptions[0]?.textContent).toBe(`${t.tz['Africa/Cairo']} (⁦Africa/Cairo⁩)`);
  });

  it('keeps a stored zone outside the list and reports the pick', () => {
    const onValue = vi.fn();
    render(<TimeZoneSelect aria-label={t.students.tz} value="Asia/Karachi" onValue={onValue} />);
    const select = screen.getByLabelText(t.students.tz) as HTMLSelectElement;
    expect(select.value).toBe('Asia/Karachi');
    fireEvent.change(select, { target: { value: 'Asia/Riyadh' } });
    expect(onValue).toHaveBeenCalledWith('Asia/Riyadh');
  });

  it('tzCity names known zones only', () => {
    expect(tzCity('Asia/Riyadh')).toBe(t.runningHead.riyadh);
    expect(tzCity('Asia/Karachi')).toBeUndefined();
  });
});
