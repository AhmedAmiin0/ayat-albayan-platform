import { teacherStatusStyle } from '@ab/money';
import { teacherName } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import {
  ApiError,
  apiFetch,
  t,
  pathKey,
  Button,
  BackButton,
  ErrorState,
  Screen,
  ScreenHeader,
  StatusChip,
  locale,
  useIsAdmin,
  Avatar,
} from '@ab/mobile-kit';
import { TeacherContact } from '@/more/teachers/TeacherContact';
import { TeacherUsername } from '@/more/teachers/TeacherUsername';
import { TeacherCalendarOwner } from '@/more/teachers/TeacherCalendarOwner';
import { TeacherStudentsSection } from '@/more/sections/TeacherStudentsSection';
import { UpcomingTimeOff } from '@/more/availability/UpcomingTimeOff';
import { WeeklyAvailability } from '@/more/availability/WeeklyAvailability';
import { StaffPhotoControl } from '@/account';
import type { Teacher } from '@ab/shared';

/** Every query where a new teacher photo must show. */
const TEACHER_KEYS = [pathKey('/teachers'), pathKey('/sales/teachers')];

/** R-TCH-01, R-TCH-02: read-only except the login username (teachers.write, docs/30 §7). */
export function TeacherDetailScreen() {
  const { id = '', status } = useLocalSearchParams<{ id: string; status?: string }>();
  const path = `/teachers/${id}`;
  const teacher = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<Teacher>(path) });
  const admin = useIsAdmin();
  const back = <BackButton onPress={() => router.back()} />;
  const data = teacher.data;

  if (!data) {
    const missing = teacher.error instanceof ApiError && teacher.error.status === 404;
    return (
      <Screen>
        <ScreenHeader title={t.teachers.profile} leading={back} />
        {teacher.isError ? (
          <ErrorState
            onRetry={() => void teacher.refetch()}
            message={missing ? t.common.notFound : t.common.error}
          />
        ) : null}
      </Screen>
    );
  }
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader title={teacherName(data, locale)} leading={back} />
        <StatusChip {...teacherStatusStyle[data.status]} label={t.enums.teacherStatus[data.status]} />
        {admin ? (
          <StaffPhotoControl
            name={teacherName(data, locale)}
            id={data.id}
            base={`${path}/avatar`}
            photo={data.avatar_url ?? null}
            invalidate={TEACHER_KEYS}
          />
        ) : (
          <Avatar name={teacherName(data, locale)} id={data.id} src={data.avatar_url} size="lg" decorative />
        )}
        <Button
          variant="secondary"
          label={t.calendar.teacherCalendar}
          onPress={() => router.push(`/more/teachers/calendar/${data.id}`)}
        />
        <Button
          variant="secondary"
          label={t.earnings.open}
          onPress={() => router.push(`/more/teachers/earnings/${data.id}`)}
        />
        <TeacherStudentsSection teacherId={data.id} status={status} />
        <TeacherContact teacher={data} />
        <TeacherUsername key={data.username ?? ''} teacher={data} />
        <TeacherCalendarOwner teacherId={data.id} />
        <WeeklyAvailability teacher={data} />
        <UpcomingTimeOff teacherId={data.id} />
      </ScrollView>
    </Screen>
  );
}
