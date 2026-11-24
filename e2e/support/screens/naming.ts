import type { ShotName } from './screens.types.ts';

const CREATE_OR_EDIT = /إضافة|أضف|جديد|تعديل|عدّل|إنشاء|أنشئ|\badd\b|\bnew\b|\bedit\b|\bcreate\b/i;
const DESTRUCTIVE = /حذف|إلغاء|إرسال|أرسل|خروج|إيقاف|\bdelete\b|\bcancel\b|\bsend\b|\bremove\b/i;

/** A button that opens a create or edit dialog, and never one that deletes, cancels or sends. */
export const isOpener = (label: string): boolean =>
  CREATE_OR_EDIT.test(label) && !DESTRUCTIVE.test(label);

function slug(route: string): string {
  return route.replace(/^\//, '').replace(/[/$:]+/g, '-') || 'home';
}

/** `<app>/<role>/<route>--<variant>[--dialog-n].png`, relative to the output folder. */
export function shotFile(name: ShotName): string {
  const dialog = name.dialog === undefined ? '' : `--dialog-${String(name.dialog)}`;
  return `${name.app}/${name.role}/${slug(name.route)}--${name.variant}${dialog}.png`;
}
