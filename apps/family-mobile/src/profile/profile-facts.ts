import { formatPhone, isFamilyEmail, type AccountProfile, type PortalStudent } from '@ab/shared';
import { t } from '@ab/mobile-kit';

export interface ProfileFact {
  label: string;
  value: string;
  /** A phone, email or code: read left to right in an isolate. */
  ltr: boolean;
}

// A code-made login's auth email is a never-delivered @family.invalid placeholder: never shown.
const realEmail = (email: string | null): string => (email && !isFamilyEmail(email) ? email : '');

/** «بياناتي»: the name, the WhatsApp number, a real email, a student's code; empty ones dropped. */
export function profileFacts(profile: AccountProfile, own: PortalStudent | null): ProfileFact[] {
  const P = t.portal.app.profile;
  const phone = profile.phone_e164 ? formatPhone(profile.phone_e164) : '';
  const facts = [
    { label: P.name, value: profile.full_name, ltr: false },
    { label: P.whatsapp, value: phone, ltr: true },
    { label: P.email, value: realEmail(profile.email), ltr: true },
    { label: P.code, value: own?.code ?? '', ltr: true },
  ];
  return facts.filter((f) => f.value !== '');
}
