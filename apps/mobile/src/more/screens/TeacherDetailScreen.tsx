import { teacherName, teacherStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { TeacherContact } from '@/more/teachers/TeacherContact';
import { TeacherUsername } from '@/more/teachers/TeacherUsername';
import { TeacherCalendarOwner } from '@/more/teachers/TeacherCalendarOwner';
import { TeacherStudentsSection } from '@/more/sections/TeacherStudentsSection';
import type { Teacher } from '@/core/lib/staff/types';
import { UpcomingTimeOff } from '@/more/availability/UpcomingTimeOff';
import { WeeklyAvailability } from '@/more/availability/WeeklyAvailability';
import { locale } from '@/core/lib/i18n/locale';
import { StaffPhotoControl } from '@/account';
import { useIsAdmin } from '@/auth';
import { Avatar } from '@/core/ui/primitives/Avatar';

/** The teacher's page and lists, and sales' «المعلمون»: where a new photo must show. */
const TEACHER_KEYS = [pathKey('/teachers'), pathKey('/sales/teachers')];

/**
 * A teacher, read-only (R-TCH-01, R-TCH-02): status, «جدول المعلم/ة» (the week's lessons), their
 * students («مشترك · تجريبي · الكل», preset by `?status=`), phone +
 * WhatsApp, the weekly availability and upcoming time-off; for an admin «الصورة» (change / remove). Editing stays on the web, except the login's
 * «اسم المستخدم» (teachers.write, docs/30 §7).
 */
export function TeacherDetailScreen() {
  const { id = '', status } = useLocalSearchParams<{ id: string; status?: string }>();
  const path = `/teachers/${id}`;
  const teacher = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<Teacher>(path) });
  const admin = useIsAdmin();
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  const data = teacher.data;

  if (!data) {
    const missing = teacher.error instanceof ApiError && teacher.error.status === 404;
    return (
      <Screen>
        <ScreenHeader title={t.teachers.profile} trailing={back} />
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
        <ScreenHeader title={teacherName(data, locale)} trailing={back} />
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
