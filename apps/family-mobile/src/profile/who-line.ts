import type { PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** «طالب · رمز الطالب AB-2041» or «ولي أمر»: the «حسابي» card and the profile's hero. */
export const whoLine = (own: PortalStudent | null): string =>
  own ? t.portal.app.account.student.replace('{code}', own.code) : t.portal.app.account.guardian;
