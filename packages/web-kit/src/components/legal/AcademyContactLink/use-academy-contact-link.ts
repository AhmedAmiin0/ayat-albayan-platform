import { contactLine } from '@ab/client-core';
import { usePublicConfig } from '@ab/web-kit/lib/settings/public-config';

export function useAcademyContactLink() {
  const line = contactLine(usePublicConfig().academy_contact);
  return { line };
}
