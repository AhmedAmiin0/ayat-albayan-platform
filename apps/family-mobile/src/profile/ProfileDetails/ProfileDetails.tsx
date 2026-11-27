import { AppText, InsetGroup, Section, t, type, useTheme } from '@ab/mobile-kit';
import type { ProfileDetailsProps } from './ProfileDetails.types';
import { FactRow } from './FactRow';

/** Read-only: the phone is the WhatsApp sign-in and the academy keeps the names. */
export function ProfileDetails({ facts }: ProfileDetailsProps) {
  const { color } = useTheme();
  const P = t.portal.app.profile;
  return (
    <Section title={P.details}>
      <InsetGroup>
        {facts.map((f) => (
          <FactRow key={f.label} fact={f} />
        ))}
      </InsetGroup>
      <AppText style={{ fontSize: type.size.xs, color: color.ink3, paddingHorizontal: 16 }}>
        {P.note}
      </AppText>
    </Section>
  );
}
