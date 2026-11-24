import { callErrorText as errorText } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const callErrorText = (error: unknown): string => errorText(error, t.calls);
