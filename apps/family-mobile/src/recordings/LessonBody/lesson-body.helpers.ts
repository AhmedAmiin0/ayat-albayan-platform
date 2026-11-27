import { t } from '@ab/mobile-kit';

export const partTitle = (i: number, total: number): string =>
  total > 1 ? t.lessonFiles.part.replace('{n}', String(i + 1)) : t.lessonFiles.recording;
