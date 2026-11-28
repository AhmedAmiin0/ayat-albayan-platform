import { describe, expect, it } from 'vitest';
import {
  chartMax,
  heightOf,
  linePoints,
} from '@ab/web-kit/components/ui/charts/ColumnChart/column-chart.helpers';

const s = (values: number[]) => ({ key: 'k', label: 'l', values });

describe('column chart scale', () => {
  it('tops out at the largest value of every series and the line', () => {
    expect(chartMax({ series: [s([1, 4]), s([3, 2])] })).toBe(4);
    expect(chartMax({ series: [s([1, 4])], line: s([9, 0]) })).toBe(9);
  });

  it('never goes below zero, even when every value is negative', () => {
    expect(chartMax({ series: [s([-5, -1])] })).toBe(0);
    expect(chartMax({ series: [] })).toBe(0);
  });

  it('turns a value into a clamped height', () => {
    expect(heightOf(2, 8)).toBe('25%');
    expect(heightOf(-3, 8)).toBe('0%');
    expect(heightOf(12, 8)).toBe('100%');
    expect(heightOf(5, 0)).toBe('0%');
  });

  it('puts each line point at the middle of its month slot', () => {
    expect(linePoints([0, 4], 4)).toBe('25,100 75,0');
  });
});
