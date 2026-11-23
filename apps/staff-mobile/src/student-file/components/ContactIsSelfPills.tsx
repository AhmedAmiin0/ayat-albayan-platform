import { t, FilterPills, type FilterPill } from '@ab/mobile-kit';

type ContactFor = 'guardian' | 'self';

const pills = (disabled: boolean): FilterPill<ContactFor>[] =>
  (['guardian', 'self'] as const).map((v) => ({ value: v, label: t.familyAuth.contactIsSelf[v], disabled }));

interface ContactIsSelfPillsProps {
  /** False means the guardian, the default. */
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Not in the original Google Form, a docs/13 deviation. */
export function ContactIsSelfPills({ value, onChange, disabled = false }: ContactIsSelfPillsProps) {
  return (
    <FilterPills<ContactFor>
      role="radiogroup"
      wrap
      accessibilityLabel={t.familyAuth.contactIsSelf.label}
      items={pills(disabled)}
      value={value ? 'self' : 'guardian'}
      onChange={(v) => onChange(v === 'self')}
    />
  );
}
