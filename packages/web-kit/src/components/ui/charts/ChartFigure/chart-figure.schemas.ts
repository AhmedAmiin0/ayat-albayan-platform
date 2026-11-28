import { z } from 'zod';

export const CHART_VIEWS = ['chart', 'table'] as const;
export const chartViewSchema = z.enum(CHART_VIEWS);
export type ChartView = z.infer<typeof chartViewSchema>;
