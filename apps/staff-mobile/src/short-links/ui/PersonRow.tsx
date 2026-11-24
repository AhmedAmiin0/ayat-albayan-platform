import type { PersonLook } from '@ab/client-core';
import { formatPhone } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, ltr, shape, type, useTheme, AppText, Avatar, Note, PhoneIcon } from '@ab/mobile-kit';

interface PersonRowProps {
  look: PersonLook;
  /** The avatar's colour seed (the person's id). */
  id?: string | null | undefined;
  children?: ReactNode;
  trailing?: ReactNode;
}

const titleOf = (look: PersonLook): string =>
  look.phone === null ? (look.name ?? '') : ltr(formatPhone(look.phone));

function noteOf(look: PersonLook): string | null {
  if (look.unregistered) return t.shortLinks.form.unregistered;
  return look.matched ? t.shortLinks.detail.matches.replace('{name}', look.name ?? '') : null;
}

function RoleTag({ label }: { label: string }) {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.sunk,
        fontFamily: type.ui[500],
        fontSize: type.size['2xs'],
        color: color.ink2,
      }}
    >
      {label}
    </AppText>
  );
}

function Leading({ look, id }: Pick<PersonRowProps, 'look' | 'id'>) {
  const { color } = useTheme();
  if (look.phone === null) return <Avatar name={look.name ?? ''} id={id} decorative />;
  const circle = { width: 36, height: 36, borderRadius: 18, backgroundColor: color.sunk };
  return (
    <View style={{ ...circle, alignItems: 'center', justifyContent: 'center' }}>
      <PhoneIcon color={color.ink2} size={18} />
    </View>
  );
}

/** A listed user, a visitor or a picked person: who they are, by name and role or by number. */
export function PersonRow({ look, id, children, trailing }: PersonRowProps) {
  const { color } = useTheme();
  const note = noteOf(look);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
      <Leading look={look} id={id} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
            {titleOf(look)}
          </AppText>
          {look.role ? <RoleTag label={t.activity.roles[look.role]} /> : null}
        </View>
        {note ? <Note>{note}</Note> : null}
        {children}
      </View>
      {trailing}
    </View>
  );
}
