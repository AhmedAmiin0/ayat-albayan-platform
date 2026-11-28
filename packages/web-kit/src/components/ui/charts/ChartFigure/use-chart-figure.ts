import { useId, useState } from 'react';
import type { ChartView } from './chart-figure.schemas';
import type { ChartFigureView } from './ChartFigure.types';

export function useChartFigure(): ChartFigureView {
  const [view, setView] = useState<ChartView>('chart');
  return { titleId: useId(), view, setView };
}
