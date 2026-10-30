import type { UserDetail } from '@ab/shared';
import type { UserCheckText } from './validation.js';

/** Plain-word messages: the tests read which check fired, not the app's language. */
export const TEXT: UserCheckText = {
  validation: {
    email: 'email',
    name: 'name',
    passwordBlank: 'blank',
    passwordShort: 'short {n}',
    passwordLong: 'long',
    teacherName: 'teacher',
    linkRequired: 'link',
  },
  phoneErrors: { not_a_number: 'nan', invalid_length: 'length', missing_country_code: 'country' },
};

export const detail = (over: Partial<UserDetail> = {}): UserDetail =>
  ({
    id: 'u1',
    email: 'a@b.co',
    full_name: 'هدى',
    phone_e164: null,
    locale: 'ar',
    tz: 'Asia/Riyadh',
    role: 'assistant',
    role_id: null,
    ...over,
  }) as UserDetail;
