import { lessonsOf, PACKAGE_IDS, PACKAGE_SIZES, type PackageId, type PackageSize } from '@ab/shared';

const isPackageId = (v: unknown): v is PackageId => PACKAGE_IDS.some((id) => id === v);

/** Pricing catalog package (docs/08: starter, bulk, weekly…) → schedule_rules.package (lesson count). */
export function packageSizeOf(id: PackageId): PackageSize {
  const lessons = String(lessonsOf(id));
  const size = PACKAGE_SIZES.find((s) => s === lessons);
  if (!size) throw new Error(`package ${id} has no package_size for ${lessons} lessons`);
  return size;
}

/** POST /booking body with `package` given as a catalog id rewritten to its package_size. */
export function withPackageSize(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || !('package' in body)) return body;
  return isPackageId(body.package) ? { ...body, package: packageSizeOf(body.package) } : body;
}
