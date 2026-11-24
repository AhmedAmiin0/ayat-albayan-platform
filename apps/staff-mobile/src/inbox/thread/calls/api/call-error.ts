import { callErrorText as errorText } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

export const callErrorText = (error: unknown): string => errorText(error, t.calls);
