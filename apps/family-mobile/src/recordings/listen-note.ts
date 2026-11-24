import { listenText, type ListenState } from '@ab/client-core';
import { ltr, t } from '@ab/mobile-kit';

export const listenNote = (state: ListenState): string => listenText(state, t.lessonFiles, ltr);
