import type { TeacherGate } from '@ab/shared';
import { Redirect } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import { t, ErrorState, Screen, useTheme } from '@ab/mobile-kit';
import { useTeacherGateState, type TeacherGateState } from '@/teacher/lib/teacher-pages';

const SPINNER = { paddingVertical: 32 };

interface Props { gate: TeacherGate; children: ReactNode }

/** When the academy switch is off, a link or push tap lands on today; an error offers retry. */
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
