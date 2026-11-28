import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartFigure } from '@ab/web-kit/components/ui/charts/ChartFigure';

const WORDS = { view: 'طريقة العرض', chart: 'رسم', table: 'جدول' };
const TABLE = {
  columns: ['الشهر', 'الإيرادات'],
  rows: [
    { key: 'jan', cells: ['يناير', '10'] },
    { key: 'feb', cells: ['فبراير', '20'] },
  ],
};

function renderFigure() {
  return render(
    <ChartFigure title="حسب الشهر" summary="ارتفعت في فبراير" words={WORDS} table={TABLE}>
      <div data-testid="chart" />
    </ChartFigure>,
  );
}

describe('ChartFigure', () => {
  it('is a figure named by its title with the summary as its caption', () => {
    renderFigure();
    const figure = screen.getByRole('figure', { name: 'حسب الشهر' });
    expect(figure.querySelector('figcaption')?.textContent).toBe('ارتفعت في فبراير');
  });

  it('shows the chart first and keeps the same numbers in a table for screen readers', () => {
    renderFigure();
    expect(screen.getByTestId('chart')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'حسب الشهر' });
    expect(table.parentElement?.className).toBe('sr-only');
    expect(within(table).getByRole('rowheader', { name: 'فبراير' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'رسم' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the hidden table out of the tab order while the chart shows', () => {
    renderFigure();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('swaps the chart for the visible table in a keyboard-reachable scroll box', () => {
    renderFigure();
    fireEvent.click(screen.getByRole('button', { name: 'جدول' }));
    expect(screen.queryByTestId('chart')).toBeNull();
    const region = screen.getByRole('region', { name: 'حسب الشهر' });
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(
      within(region)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['الشهر', 'الإيرادات']);
    fireEvent.click(screen.getByRole('button', { name: 'رسم' }));
    expect(screen.getByTestId('chart')).toBeTruthy();
  });

  it('draws an empty table body when there are no rows', () => {
    render(
      <ChartFigure title="ت" summary="س" words={WORDS} table={{ ...TABLE, rows: [] }}>
        <span />
      </ChartFigure>,
    );
    expect(screen.queryByRole('rowheader')).toBeNull();
  });
});
