import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { WeekSummary } from './WeekSummary';

const S = t.portal.app.schedule;
const teacher = (name: string) => ({ id: name, display_name_ar: name, display_name_en: null });
const summary = (names: string[]) => ({ lessons: 3, awaiting: 1, teachers: names.map(teacher) });

describe('WeekSummary', () => {
  it('a guardian sees what waits and the teachers in one line', () => {
    render(<WeekSummary summary={summary(['أحمد', 'سارة'])} guardian />);
    expect(screen.getByText(S.awaiting)).toBeTruthy();
    expect(screen.getByText('أحمد · سارة')).toBeTruthy();
  });

  it('a student sees no awaiting row', () => {
    render(<WeekSummary summary={summary(['أحمد'])} guardian={false} />);
    expect(screen.queryByText(S.awaiting)).toBeNull();
    expect(screen.getByText('أحمد')).toBeTruthy();
  });

  it('no teachers: no teachers row', () => {
    render(<WeekSummary summary={summary([])} guardian={false} />);
    expect(screen.queryByText(S.teachers)).toBeNull();
  });
});
