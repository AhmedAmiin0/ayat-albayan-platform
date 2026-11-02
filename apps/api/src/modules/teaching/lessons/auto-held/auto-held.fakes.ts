// Test-only: the auto-held correction over a fake store (LessonCancelService's 4th dependency).
import { vi } from 'vitest';
import type { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { AutoHeldCorrection } from './auto-held-correction';
import type { AutoHeldRepo } from './auto-held.repo';

/** `correctable`: the lesson ids the job closed with no report since (none by default). */
export function fakeCorrection(store: LessonStore, settings: LessonsSettings, correctable: string[] = []) {
  const repo = { correctable: vi.fn(async (ids: readonly string[]) => new Set(ids.filter((id) => correctable.includes(id)))) };
  return { repo, correction: new AutoHeldCorrection(repo as unknown as AutoHeldRepo, store, settings) };
}
