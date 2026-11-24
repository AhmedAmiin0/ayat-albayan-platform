import { teacherName } from '@ab/schedule';
import type { TeacherGate } from '@ab/settings';
import { type Href, router } from 'expo-router';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import {
  t,
  BiometricSwitchRow,
  ListRow,
  Screen,
  ScreenHeader,
  InsetGroup,
  SignOutButton,
  locale,
  AppearancePicker,
  LanguageRow,
} from '@ab/mobile-kit';
import { ClockFormatPicker } from '@/more';
import { useTeacherMe } from '@/teacher/lib/queries';
import { useTeacherGateOpen } from '@/teacher/lib/teacher-pages';

type GateOpen = (gate: TeacherGate) => boolean;
interface MoreRow { title: string; href: Href; visible: (open: GateOpen) => boolean }

const always = (): boolean => true;
const gated = (gate: TeacherGate) => (open: GateOpen): boolean => open(gate);
/** Statements live inside earnings; with earnings off they get their own row. */
const statementsAlone = (open: GateOpen): boolean => !open('earnings') && open('statements');

/** Gated rows follow the academy's teacher page switches. */
const ROWS: readonly MoreRow[] = [
  // The native tab bar holds five, so availability leads the more screen.
  { title: t.availability.title, href: '/teacher/more/availability', visible: always },
  { title: t.teacherNav.students, href: '/teacher/more/students', visible: always },
  { title: t.teacherNav.messages, href: '/teacher/more/messages', visible: gated('messages') },
  { title: t.teacherNav.payouts, href: '/teacher/more/earnings', visible: gated('earnings') },
  { title: t.teacherNav.statements, href: '/teacher/more/payouts', visible: statementsAlone },
  { title: t.mobile.feedback.title, href: '/teacher/more/feedback', visible: gated('feedback') },
  { title: t.mobileClassroom.meetingsRow, href: '/teacher/more/meetings', visible: gated('meetings') },
];

/** Teacher more (R-TCH-02, R-TCH-04, R-MOB-02); availability is read-only, the admin edits it. */
export function TeacherMoreScreen() {
  const me = useTeacherMe();
  const open = useTeacherGateOpen();
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={me.data && teacherName(me.data, locale)}
        trailing={<AccountHeaderAvatar href="/teacher/more/account" />}
      />
      <InsetGroup>
        <AccountRow href="/teacher/more/account" />
        {ROWS.filter((row) => row.visible(open)).map((row) => (
          <ListRow key={row.title} title={row.title} onPress={() => router.push(row.href)} />
        ))}
      </InsetGroup>
      <AppearancePicker />
      <ClockFormatPicker />
      <BiometricSwitchRow />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
