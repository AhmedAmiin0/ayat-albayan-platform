import type { ThreadStudentView } from '@ab/shared';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, type TreeBase, useTreeBase } from '@/core/nav/tree-base';
import { ThreadMenu, type ThreadMenuItem } from './ThreadMenu';

/**
 * «تفاصيل الطالب» in the sales tree, the student file in the admin's, both inside the chat group
 * (app/(sales-chat)/sales/inbox/student, app/(admin-chat)/inbox/student) so «رجوع» returns to the chat,
 * not to the tabs (owner 2026-10-29). None in the assistant's tree.
 */
const detailsHref = (base: TreeBase, id: string): Href | null =>
  base === '/assistant' ? null : inTree(base, `/inbox/student/${id}` as Href);

/**
 * Tapping the chat's name or number opens the student's details, as WhatsApp opens the contact
 * (owner 2026-10-29): one student at once, several from a sheet of «name · AB-nnnn». No student: no tap.
 */
export function useHeaderStudents(students: readonly ThreadStudentView[]) {
  const base = useTreeBase();
  const [open, setOpen] = useState(false);
  const items = students.flatMap((s): ThreadMenuItem[] => {
    const href = detailsHref(base, s.id);
    return href ? [{ label: `${s.name} · ${s.code}`, onPress: () => router.push(href) }] : [];
  });
  const [first] = items;
  const onPress = !first ? undefined : items.length === 1 ? first.onPress : () => setOpen(true);
  const sheet =
    items.length > 1 ? (
      <ThreadMenu open={open} items={items} label={t.inbox.studentDetails} onClose={() => setOpen(false)} />
    ) : null;
  return { onPress, sheet };
}
