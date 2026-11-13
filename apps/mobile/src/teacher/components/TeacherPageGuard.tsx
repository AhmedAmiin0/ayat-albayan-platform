import type { TeacherGate } from '@ab/shared';
import { Redirect } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { useTeacherGateState, type TeacherGateState } from '@/teacher/lib/teacher-pages';
import { useTheme } from '@/theme';

const SPINNER = { paddingVertical: 32 };

interface Props { gate: TeacherGate; children: ReactNode }

/**
 * A teacher route behind its academy switch (owner 2026-11-13): a spinner until the settings
 * answer, the screen when on, «اليوم» when off (a link, a push tap, a saved route), an error
 * with retry when the settings cannot be read.
 */
export function TeacherPageGuard({ gate, children }: Props) {
  const { state, retry } = useTeacherGateState(gate);
  const { color } = useTheme();
  const view: Record<TeacherGateState, ReactNode> = {
    loading: (
      <Screen>
        <ActivityIndicator
          accessibilityLabel={t.common.loading}
          color={color.lapis}
          style={SPINNER}
        />
      </Screen>
    ),
    error: (
      <Screen>
        <ErrorState onRetry={retry} />
      </Screen>
    ),
    open: children,
    closed: <Redirect href="/teacher/today" />,
  };
  return view[state];
}

/** A route file's default export: `guardedTeacherRoute('earnings', MyEarningsScreen)`. */
export function guardedTeacherRoute(gate: TeacherGate, Screen: ComponentType) {
  return function GuardedTeacherRoute() {
    return (
      <TeacherPageGuard gate={gate}>
        <Screen />
      </TeacherPageGuard>
    );
  };
}
