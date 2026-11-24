import { parseSalesFamily, type FamilySibling, type SalesStudentFamily } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { studentStatusStyle } from '@ab/money';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, StatusChip, ListRow, InsetGroup } from '@ab/mobile-kit';
import { studentDetailsHref, useStudentHref, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { familyChatHref } from '@/sales/sales/lib/sales-href';
import { fill } from '@/sales/sales/lib/sales-text';

interface FamilySectionProps {
  /** GET /sales/students/:id `family` (absent in an old cache: no section). */
  family: unknown;
  /** The guardian's phone (null for a viewer who cannot open the chats: no tap). */
  phone: string | null;
}

const hasFamily = (f: SalesStudentFamily, phone: string | null): boolean =>
  [f.guardian_name, phone].some(Boolean) || f.siblings.length > 0 || f.contact_is_self;

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
