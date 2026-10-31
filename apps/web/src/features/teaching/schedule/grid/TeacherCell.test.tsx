import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { T_ABRAR, T_FATMA, T_NOUR } from '../overview-fixture';
import { TeacherCell } from './TeacherCell';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/admin/teachers/x">{children}</a>,
}));

const NOW = new Date('2026-10-03T09:00:00.000Z'); // 12:00 Riyadh, 12:00 Cairo (summer, UTC+3)
const WINTER = new Date('2026-12-05T09:00:00.000Z'); // 12:00 Riyadh, 11:00 Cairo (UTC+2)

describe('TeacherCell', () => {
  it('a Cairo teacher: role line, their own clock and the load against the maximum', () => {
    render(<TeacherCell teacher={T_ABRAR} now={WINTER} />);
    expect(screen.getByRole('link', { name: 'أبرار' })).toBeTruthy();
    expect(screen.getByText(`${t.teachers.genderLabel.female} · ${t.enums.program.quran}`)).toBeTruthy();
    expect(screen.getByText(/عند المعلم\/ة 11:00 بتوقيت القاهرة/)).toBeTruthy();
  });

  it('a Cairo teacher in summer reads the viewer clock: no second clock', () => {
    render(<TeacherCell teacher={T_ABRAR} now={NOW} />);
    expect(screen.queryByText(/عند المعلم/)).toBeNull();
    expect(screen.getByText('4 من 10')).toBeTruthy();
  });

  it('a Riyadh teacher shows no second clock; no maximum shows the count alone', () => {
    render(<TeacherCell teacher={T_NOUR} now={NOW} />);
    expect(screen.queryByText(/عند المعلم/)).toBeNull();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('time off in the window is one marginal note with the reason', () => {
    render(<TeacherCell teacher={T_FATMA} now={NOW} />);
    const note = screen.getByText(new RegExp(`^${t.schedule.dayOff} · .* · سفر$`));
    expect(note.className).toContain('border-danger');
  });
});
