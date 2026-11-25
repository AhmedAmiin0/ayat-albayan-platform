import { callErrorText as errorText } from '@ab/client-core';
import { t } from '@ab/web-kit';

export const callErrorText = (error: unknown): string => errorText(error, t.calls);
