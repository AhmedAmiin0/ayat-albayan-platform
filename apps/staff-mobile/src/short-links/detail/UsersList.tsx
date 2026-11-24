import { notOpenedCount, sendLook, userLook, visitOf } from '@ab/client-core';
import type { ShortLinkDetail, ShortLinkUser } from '@ab/shared';
import { counted } from '@ab/core';
import { View } from 'react-native';
import { t, ErrorLine, InsetGroup, Note, Section } from '@ab/mobile-kit';
import { LinkChip } from '@/short-links/ui/LinkChip';
import { PersonRow } from '@/short-links/ui/PersonRow';

const D = () => t.shortLinks.detail;

function sendErrorText(code: string): string {
  const known: Partial<Record<string, string>> = {
    template_not_approved: D().sendErrors.template_not_approved,
    no_phone: D().sendErrors.no_phone,
  };
  return known[code] ?? D().sendErrors.unknown.replace('{code}', code);
}

function UserRow({ user, opened }: { user: ShortLinkUser; opened: boolean }) {
  const look = sendLook(user.sendStatus);
  return (
    <PersonRow look={userLook(user)} id={user.person?.id}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <LinkChip look={look} label={t.shortLinks.send[look.key]} />
        {opened ? null : <Note>{D().notOpenedYet}</Note>}
      </View>
      {user.sendError ? <ErrorLine message={sendErrorText(user.sendError)} /> : null}
    </PersonRow>
  );
}

export function UsersList({ link }: { link: ShortLinkDetail }) {
  const users = link.userList;
  const waiting = notOpenedCount(link);
  const title = `${D().users} · ${counted(D().usersCount, users.length)}`;
  if (users.length === 0) return <Note>{D().noUsers}</Note>;
  return (
    <Section title={title}>
      {waiting > 0 ? <Note>{counted(D().notOpened, waiting)}</Note> : null}
      <InsetGroup testID="link-users">
        {users.map((u) => (
          <UserRow key={u.id} user={u} opened={visitOf(u, link.visitorList) !== null} />
        ))}
      </InsetGroup>
    </Section>
  );
}
