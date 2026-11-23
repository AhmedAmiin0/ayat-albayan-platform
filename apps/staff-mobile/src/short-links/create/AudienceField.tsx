import { listedCount, maxUsersOf, type LinkForm } from '@ab/client-core';
import { counted, SHORT_LINK_AUDIENCES, type ShortLinkAudience } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, ErrorLine, FilterPills, InsetGroup, ListRow, Note } from '@ab/mobile-kit';
import { PeopleSheet, type PeoplePicked } from '@/short-links/people/PeopleSheet';

interface AudienceFieldProps {
  form: LinkForm;
  set: (patch: Partial<LinkForm>) => void;
  /** users_required / too_many_users / phone_invalid. */
  error?: string | undefined;
}

const F = () => t.shortLinks.form;

/** «أحمد علي، سارة محمود ورقم هاتف». */
function namesLine(form: LinkForm): string {
  const names = form.people.map((p) => p.name).join(t.common.listSeparator);
  const phone = form.phones.length > 0 ? F().andPhone : '';
  return [names, phone].filter((part) => part !== '').join(' ');
}

/** The typed limit, when it is a whole number («تم · 5 من 5 مسموح»). */
function limitOf(form: LinkForm): number | null {
  const max = maxUsersOf(form.maxUsers);
  return max !== null && Number.isInteger(max) ? max : null;
}

const needsPeople = (form: LinkForm): boolean => form.audience === 'listed' || form.sendWhatsapp;

/** «5 أشخاص» and who they are; «أضف من مستخدمي المنصة» while nobody is listed. */
function PeopleSummary({ form, onOpen }: { form: LinkForm; onOpen: () => void }) {
  const n = listedCount(form);
  const title = n === 0 ? F().addPeople : counted(F().listedPeople, n);
  return (
    <InsetGroup>
      <ListRow title={title} subtitle={namesLine(form) || undefined} onPress={onOpen} />
    </InsetGroup>
  );
}

/**
 * «من يمكنه فتح الرابط» (board LinkXStaffCreate): anyone who confirms who they are, or only the
 * listed people (picked on the people sheet); the list also feeds the WhatsApp send.
 */
export function AudienceField({ form, set, error }: AudienceFieldProps) {
  const [picking, setPicking] = useState(false);
  const done = (picked: PeoplePicked) => {
    set(picked);
    setPicking(false);
  };
  return (
    <View style={{ gap: 8 }}>
      <FilterPills<ShortLinkAudience>
        items={SHORT_LINK_AUDIENCES.map((a) => ({ value: a, label: t.shortLinks.audience[a] }))}
        value={form.audience}
        onChange={(audience) => set({ audience })}
        role="radiogroup"
        accessibilityLabel={F().audience}
      />
      {needsPeople(form) ? <PeopleSummary form={form} onOpen={() => setPicking(true)} /> : null}
      {error ? <ErrorLine message={error} /> : null}
      {form.audience === 'listed' ? <Note>{F().listedHint}</Note> : null}
      {picking ? (
        <PeopleSheet
          people={form.people}
          phones={form.phones}
          maxUsers={limitOf(form)}
          onDone={done}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}
