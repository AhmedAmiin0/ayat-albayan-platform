import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { canOpen } from '@/core/auth/route-permissions';
import {
  t,
  ListRow,
  Screen,
  ScreenHeader,
  useTabBarInset,
  InsetGroup,
  useNow,
} from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';
import { addDays, riyadhToday } from '@/calendar';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { AssistantLessonsList } from '@/classroom/assistants/AssistantLessonsList';
import { DaySwitcher } from '@/classroom/sessions/DaySwitcher';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { Note } from '@/core/ui/feedback/Note';
import { HeldBell } from '@/notifications/HeldBell';
import { assistantDay } from './assistant-day';

/**
 * The assistant's lessons (web /assistant/ AssistantHome): the open lessons of the students they
 * assist, today first and a day at a time; the room opens in the system browser, as every mobile
 * classroom entry does. Internal meetings below (meetings.read) as on the web page. The bell at
 * the header's end (notifications.push).
 */
export function AssistantHomeScreen({ can }: { can: Can }) {
  // academy day (docs/34 b): the day pages as the calendar's; times read in the viewer's zone.
  const today = riyadhToday(useNow());
  const zone = zoneNote(useViewerTz());
  const [date, setDate] = useFollowingDay(today);
  const isToday = date === today;
  const inset = useTabBarInset();
  return (
    <Screen list>
      <ScreenHeader
        title={t.mobileRoles.lessonsTitle}
        subtitle={zone}
        trailing={<HeldBell tree="assistant" />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 32 + inset }}
      >
        <DaySwitcher
          date={date}
          isToday={isToday}
          onStep={(n) => setDate(addDays(date, n))}
          onToday={() => setDate(today)}
        />
        <Note>{t.mobileRoles.joinNote}</Note>
        <AssistantLessonsList
          day={assistantDay(date)}
          emptyTitle={isToday ? undefined : t.mobileRoles.dayEmpty}
        />
        {canOpen(can, 'meetings') ? (
          <InsetGroup>
            <ListRow title={t.mobileClassroom.meetingsRow} onPress={() => router.push('/assistant/lessons/meetings')} />
          </InsetGroup>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
