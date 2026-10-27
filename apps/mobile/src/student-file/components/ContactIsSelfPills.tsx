import { t } from '@/core/lib/i18n/i18n';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';

type ContactFor = 'guardian' | 'self';

const pills = (disabled: boolean): FilterPill<ContactFor>[] =>
  (['guardian', 'self'] as const).map((v) => ({ value: v, label: t.familyAuth.contactIsSelf[v], disabled }));

interface ContactIsSelfPillsProps {
  /** students.contact_is_self; false = «ولي الأمر» (the default). */
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1; NOT in the owner's Google Form, a docs/13
 * deviation). Wording only: «الطالب نفسه» = an adult student is their own WhatsApp contact.
 */
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
