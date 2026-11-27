import { DEFAULT_PASSWORD_MIN } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';

export const hint = t.account.password.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN));
