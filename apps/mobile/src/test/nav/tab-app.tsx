import { renderRouter } from 'expo-router/testing-library';
import type { ComponentType } from 'react';
import { AppText } from '@/core/ui/primitives/AppText';
import { TabStack, tabStackSettings } from '@/core/nav/TabStack';
import { AppNativeTabs } from '@/core/ui/layout/AppNativeTabs';

/** Test-only: the real tabs (Today, students, more) with the real tab stacks over stub screens. */
const TABS = [
  { name: 'index', title: 'today', icon: 'today' },
  { name: 'students', title: 'students', icon: 'students' },
  { name: 'more', title: 'more', icon: 'more' },
] as const;

const tabStack = { default: TabStack, unstable_settings: tabStackSettings };
const stub = (label: string) => () => <AppText>{label}</AppText>;

export const TabsLayout = () => <AppNativeTabs tabs={TABS} />;

/** The app: `layout` around the tabs, `student` as /students/[id] (a stub by default). */
export function tabApp(layout: ComponentType, student: ComponentType = stub('student-detail')) {
  return {
    _layout: layout,
    index: stub('today-screen'),
    'students/_layout': tabStack,
    'students/index': stub('students-list'),
    'students/[id]': student,
    'more/_layout': tabStack,
    'more/index': stub('more-list'),
    'more/teachers/[id]': stub('teacher-detail'),
  };
}

/** Renders the app at `initialUrl`; the returned function reads the current pathname. */
export async function openTabApp(app: ReturnType<typeof tabApp>, initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return () => pending.getPathname();
}
