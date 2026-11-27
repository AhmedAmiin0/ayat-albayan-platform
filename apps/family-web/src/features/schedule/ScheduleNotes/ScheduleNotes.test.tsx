import { setViewerPersonTz } from '@ab/client-core';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t, tzCity } from '@ab/web-kit';
import { ScheduleNotes } from './ScheduleNotes';

const S = t.portal.app.schedule;

afterEach(() => {
  setViewerPersonTz(null);
});

describe('ScheduleNotes', () => {
  it('whose clock the times are on, by city', () => {
    setViewerPersonTz('Asia/Riyadh');
    render(<ScheduleNotes />);
    const city = tzCity('Asia/Riyadh') ?? 'Asia/Riyadh';
    expect(screen.getByText(S.tzNote.replace('{zone}', city))).toBeTruthy();
  });

  it('when joining opens, and the room note', () => {
    render(<ScheduleNotes />);
    expect(screen.getByText(S.joinNote)).toBeTruthy();
    expect(screen.getByText(t.portal.app.lesson.roomNote)).toBeTruthy();
  });
});
