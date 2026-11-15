interface StepRange {
  min: number;
  max: number;
  step: number;
  /** Past an edge go round to the other end (a clock), else stop at it. */
  wrap: boolean;
}

/** One step of a stepper: `value` ± `step`, held in [min, max] or wrapped round it (23 + 1 → 0). */
export function stepValue(value: number, dir: 1 | -1, range: StepRange): number {
  const next = value + dir * range.step;
  if (!range.wrap) return Math.min(range.max, Math.max(range.min, next));
  const span = range.max - range.min + range.step;
  return ((((next - range.min) % span) + span) % span) + range.min;
}
