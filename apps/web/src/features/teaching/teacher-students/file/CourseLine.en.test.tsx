import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseLine } from './CourseLine';
import { COURSE } from './file-data';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

describe('CourseLine, English (docs/47)', () => {
  it('start, lessons left, the count and the every-teacher hint', () => {
    render(<CourseLine course={COURSE} tz="Africa/Cairo" />);
    expect(screen.getByText('Course start: 1 September 2026')).toBeTruthy();
    expect(screen.getByText('Ends after 3 lessons')).toBeTruthy();
    expect(screen.getByText('Lessons: 5 of 8')).toBeTruthy();
    expect(screen.getByText(en.teacherFile.courseHint)).toBeTruthy();
  });

  it('a stopped course and no course', () => {
    const stopped = { ...COURSE, stopped_at: '2026-10-01T10:00:00.000Z' };
    const { rerender } = render(<CourseLine course={stopped} tz="Africa/Cairo" />);
    expect(screen.getByText('Course stopped on 1 October 2026')).toBeTruthy();
    rerender(<CourseLine course={null} tz="Africa/Cairo" />);
    expect(screen.getByText(en.teacherFile.noCourse)).toBeTruthy();
  });
});
