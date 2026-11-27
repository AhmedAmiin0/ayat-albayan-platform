import type { LessonOption } from '@ab/client-core';

export const VARIANT: Readonly<Record<LessonOption, 'primary' | 'secondary' | 'ghost'>> = {
  confirm: 'primary',
  request: 'secondary',
  withdraw: 'secondary',
  decline: 'ghost',
};
