import type { ThreadStudentView } from '@ab/shared';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { inTree, type TreeBase, useTreeBase } from '@/core/nav/tree-base';
import { ThreadMenu, type ThreadMenuItem } from './ThreadMenu';

/** Routes stay inside the chat group so back returns to the chat, not the tabs. */
const detailsHref = (base: TreeBase, id: string, phone: string): Href | null =>
  base === '/assistant' ? null : inTree(base, `/inbox/student/${id}${phoneQuery(phone)}` as Href);

/** docs/37 NEW 2. */
const phoneQuery = (phone: string): string => (phone ? `?phone=${encodeURIComponent(phone)}` : '');

export const studentLine = (s: ThreadStudentView): string =>
  [s.name, s.code, t.enums.studentStatus[s.status], ...(s.teacher_name ? [s.teacher_name] : [])].join(' · ');

/**
 * Tapping the chat's name or number opens the student's details, as WhatsApp opens the contact
 *: one student at once, several from a sheet of studentLine. No student: no tap.
 */
export function useHeaderStudents(students: readonly ThreadStudentView[]) {
  const base = useTreeBase();
  // The chat route's own phone (encoded + decoded by expo-router).
  const { phone = '' } = useLocalSearchParams<{ phone?: string }>();
  const [open, setOpen] = useState(false);
  const items = students.flatMap((s): ThreadMenuItem[] => {
    const href = detailsHref(base, s.id, phone);
    return href ? [{ label: studentLine(s), onPress: () => router.push(href) }] : [];
  });
  const [first] = items;
  const onPress = !first ? undefined : items.length === 1 ? first.onPress : () => setOpen(true);
  const sheet =
    items.length > 1 ? (
      <ThreadMenu open={open} items={items} label={t.inbox.studentDetails} onClose={() => setOpen(false)} />
    ) : null;
  return { onPress, sheet };
}
