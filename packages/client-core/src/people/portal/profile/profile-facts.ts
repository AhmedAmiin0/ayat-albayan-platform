import { isFamilyEmail, type PortalStudent } from '@ab/shared';
import { formatPhone } from '@ab/core';
import type { OwnProfile } from './own-profile.js';

export interface ProfileFact {
  label: string;
  value: string;
  /** A phone, email or code: read left to right in an isolate. */
  ltr: boolean;
}

/** The facts' words: each app passes its own `t.portal.app.profile`. */
export interface ProfileFactWords {
  name: string;
  whatsapp: string;
  email: string;
  code: string;
}

type FactSource = Pick<OwnProfile, 'full_name' | 'email' | 'phone_e164'>;

// A code-made login's auth email is a never-delivered @family.invalid placeholder: never shown.
const realEmail = (email: string | null): string => (email && !isFamilyEmail(email) ? email : '');

/** The name, the WhatsApp number, a real email, a student's code; empty ones dropped. */
export function profileFacts(
  profile: FactSource,
  own: PortalStudent | null,
  words: ProfileFactWords,
): ProfileFact[] {
  const phone = profile.phone_e164 ? formatPhone(profile.phone_e164) : '';
  const facts = [
    { label: words.name, value: profile.full_name, ltr: false },
    { label: words.whatsapp, value: phone, ltr: true },
    { label: words.email, value: realEmail(profile.email), ltr: true },
    { label: words.code, value: own?.code ?? '', ltr: true },
  ];
  return facts.filter((f) => f.value !== '');
}
