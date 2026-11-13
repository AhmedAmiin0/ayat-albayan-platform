import { teacherName, type TeacherGate } from '@ab/shared';
import { type Href, router } from 'expo-router';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { t } from '@/core/lib/i18n/i18n';
import { AppearancePicker } from '@/more/appearance/AppearancePicker';
import { ClockFormatPicker } from '@/more';
import { LanguageRow } from '@/more/appearance/LanguageRow';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { InsetGroup } from '@/core/ui/surface/inset';
import { useTeacherMe } from '@/teacher/lib/queries';
import { useTeacherGateOpen } from '@/teacher/lib/teacher-pages';
import { SignOutButton } from '@/teacher/components/SignOutButton';
import { locale } from '@/core/lib/i18n/locale';

type GateOpen = (gate: TeacherGate) => boolean;
interface MoreRow { title: string; href: Href; visible: (open: GateOpen) => boolean }

const always = (): boolean => true;
const gated = (gate: TeacherGate) => (open: GateOpen): boolean => open(gate);
/** «كشوف الشهر» is one tap inside «أرباحي»; with «أرباحي» off it gets its own row. */
const statementsAlone = (open: GateOpen): boolean => !open('earnings') && open('statements');

/** The rows in order; the gated ones follow the academy switches (settings «صفحات المعلم»). */
const ROWS: readonly MoreRow[] = [
  { title: t.teacherNav.students, href: '/teacher/more/students', visible: always },
  { title: t.teacherNav.messages, href: '/teacher/more/messages', visible: gated('messages') },
  { title: t.teacherNav.payouts, href: '/teacher/more/earnings', visible: gated('earnings') },
  { title: t.teacherNav.statements, href: '/teacher/more/payouts', visible: statementsAlone },
  { title: t.mobile.feedback.title, href: '/teacher/more/feedback', visible: gated('feedback') },
  { title: t.mobileClassroom.meetingsRow, href: '/teacher/more/meetings', visible: gated('meetings') },
  { title: t.availability.title, href: '/teacher/more/availability', visible: always },
];

/**
 * The teacher's «المزيد» (R-TCH-02, R-TCH-04, R-MOB-02): my students (subscribed and trial), my earnings per lesson (monthly statements one tap in), my weekly
 * availability and time-off (read-only; the admin edits them), «حسابي» (R-ACC-01), the appearance, the language,
 * sign-out. The rows sit in one inset card inside the gutter (owner 2026-10-28: one container rule).
 */
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
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
