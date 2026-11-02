import {
  formatPhone,
  parseSalesFamily,
  studentStatusStyle,
  type FamilySibling,
  type SalesStudentFamily,
} from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { studentDetailsHref, useStudentHref, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/more';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { familyChatHref } from '@/sales/sales/lib/sales-href';
import { fill } from '@/sales/sales/lib/sales-text';

interface FamilySectionProps {
  /** GET /sales/students/:id `family` (absent in an old cache: no section). */
  family: unknown;
  /** The guardian's phone (null for a viewer who cannot open the chats: no tap). */
  phone: string | null;
}

/** Something to say: a guardian to name or reach, a sibling, or «صاحب الرقم». */
const hasFamily = (f: SalesStudentFamily, phone: string | null): boolean =>
  [f.guardian_name, phone].some(Boolean) || f.siblings.length > 0 || f.contact_is_self;

/**
 * «العائلة» of «تفاصيل الطالب» (owner 2026-11-02), compact: the guardian (name, LTR phone; a tap
 * opens the family's chat), «الطالب هو صاحب رقم المحادثة» when they are, then the siblings, each
 * with code and status; a tap opens that student.
 */
export function FamilySection({ family: raw, phone }: FamilySectionProps) {
  const base = useTreeBase();
  const to = useStudentHref();
  const family = parseSalesFamily(raw);
  if (!family || !hasFamily(family, phone)) return null;
  const f = t.students.family;
  const open = (s: FamilySibling) => router.push(to(studentDetailsHref(base, s.id)));
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{f.title}</SectionLabel>
      <InsetGroup>
        <GuardianRow name={family.guardian_name} phone={phone} />
        {family.siblings.map((s) => (
          <ListRow
            key={s.id}
            title={s.name}
            meta={s.code ?? undefined}
            subtitle={f.siblings}
            onPress={() => open(s)}
            accessibilityHint={fill(f.openStudent, { name: s.name })}
            trailing={
              <StatusChip {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} size="sm" />
            }
          />
        ))}
      </InsetGroup>
      {family.contact_is_self ? <Note>{f.contactIsSelf}</Note> : null}
    </View>
  );
}

/** The guardian: name (or «ولي الأمر») and LTR phone; a tap opens the family chat if any. */
function GuardianRow({ name, phone }: { name: string | null; phone: string | null }) {
  const base = useTreeBase();
  const openChat = phone ? () => router.push(familyChatHref(base, phone)) : undefined;
  return (
    <ListRow
      title={name ?? t.students.family.noGuardianName}
      meta={phone ? formatPhone(phone) : undefined}
      subtitle={name ? t.students.guardian : undefined}
      onPress={openChat}
      accessibilityHint={openChat ? t.students.family.openChat : undefined}
    />
  );
}
