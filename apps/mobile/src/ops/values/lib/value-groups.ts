import {
  OWNED_VALUE_GROUPS,
  VALUE_GROUP_IDS,
  VALUE_GROUPS,
  type SettingKey,
  type ValueGroupId,
} from '@ab/shared';
import { textAt } from './value-text';

/** The chip strip: the editable groups, then the module-owned ones (read-only, «للاطلاع»). */
export type GroupId = ValueGroupId | keyof typeof OWNED_VALUE_GROUPS;

export const GROUP_IDS: readonly GroupId[] = [
  ...VALUE_GROUP_IDS,
  ...(Object.keys(OWNED_VALUE_GROUPS) as (keyof typeof OWNED_VALUE_GROUPS)[]),
];

const isOwnedGroup = (id: GroupId): id is keyof typeof OWNED_VALUE_GROUPS => Object.hasOwn(OWNED_VALUE_GROUPS, id);

/** The keys one group's table shows, in list order. */
export function groupKeys(id: GroupId): readonly SettingKey[] {
  return isOwnedGroup(id) ? OWNED_VALUE_GROUPS[id] : VALUE_GROUPS[id];
}

/** The chip's name: the old page's section title where one exists, else «القيم»'s own. */
export function groupLabel(id: GroupId): string {
  return textAt(`settings.sections.${id}`) ?? textAt(`mobileValues.groups.${id}`) ?? id;
}
