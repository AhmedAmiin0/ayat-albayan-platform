import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { addDays, riyadhToday } from '@/calendar/lib/week';
import { AssistantLessonsList } from '@/classroom/assistants/AssistantLessonsList';
import { DaySwitcher } from '@/classroom/sessions/DaySwitcher';
import { useMinuteClock } from '@/classroom/sessions/use-minute-clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { HeldBell } from '@/notifications/HeldBell';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { assistantDay } from './assistant-day';

/**
 * «حلقاتي» (web /assistant/ AssistantHome): the open lessons of the students they assist, today
 * first and a day at a time, each with «ادخل الحلقة» (the room opens in the system browser, as
 * every mobile classroom entry does). Below, «اجتماعات داخلية» (meetings.read) as on the web page.
 * The bell at the header's end (notifications.push).
 */
export function AssistantHomeScreen({ can }: { can: Can }) {
  const today = riyadhToday(useMinuteClock());
  const [date, setDate] = useState(today);
  const isToday = date === today;
  const inset = useTabBarInset();
  return (
    <Screen list>
      <ScreenHeader title={t.mobileRoles.lessonsTitle} subtitle={t.schedule.riyadhTime} trailing={<HeldBell tree="assistant" />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 + inset }}>
        <DaySwitcher date={date} isToday={isToday} onStep={(n) => setDate(addDays(date, n))} onToday={() => setDate(today)} />
        <Note>{t.mobileRoles.joinNote}</Note>
        <AssistantLessonsList day={assistantDay(date)} emptyTitle={isToday ? undefined : t.mobileRoles.dayEmpty} />
        {canOpen(can, 'meetings') ? (
          <View style={{ marginHorizontal: -16 }}>
            <ListRow title={t.mobileClassroom.meetingsRow} onPress={() => router.push('/assistant/lessons/meetings')} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
