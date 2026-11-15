import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { LeadStudentStep } from './LeadStudentStep';
import { leadParts } from './new-student';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1, a docs/13 deviation) on step 1 of the lead path.

const C = t.familyAuth.contactIsSelf;
const BASE = { name: 'جود', guardianName: 'منى', guardianPhone: '0501234567' };
const FAMILY = { program: 'quran', tz: 'Africa/Cairo', pkg: 'trial', genderPref: null, country: 'EG' } as const;

describe('LeadStudentStep: whose WhatsApp number', () => {
  it('defaults to «ولي الأمر»; picking «الطالب نفسه» patches the draft', () => {
    const onChange = vi.fn();
    render(<LeadStudentStep value={BASE} tz="Africa/Cairo" onChange={onChange} />);
    expect(screen.getByRole('group', { name: C.label })).toBeTruthy();
    expect(screen.getByRole('radio', { name: C.guardian })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: C.self }));
    expect(onChange).toHaveBeenCalledWith({ newStudent: { ...BASE, contactIsSelf: true } });
  });

  it('POST /booking sends contact_is_self only for «الطالب نفسه»', () => {
    expect(leadParts({ ...BASE, contactIsSelf: true }, FAMILY).newStudent).toMatchObject({ contact_is_self: true });
    expect(leadParts(BASE, FAMILY).newStudent).not.toHaveProperty('contact_is_self');
  });
});
