import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { configWrapper } from '@ab/web-kit/testing';
import { WeekGrid } from './WeekGrid';

// At 1408px the admin page has about 1070px for the grid: the last day was clipped at 1100px.
describe('WeekGrid width (docs/65 UX-6)', () => {
  it('the all-teachers grid fits a 1408px window without cutting the last day', () => {
    render(
      <WeekGrid week="2026-11-21" today="2026-11-24" lessons={[]} onOpen={vi.fn()} teachers={[]} />,
      { wrapper: configWrapper() },
    );
    const cls = screen.getByRole('table', { name: t.schedule.grid }).className;
    expect(cls).toContain('min-w-[1040px]');
    expect(cls).not.toContain('min-w-[1100px]');
  });
});
