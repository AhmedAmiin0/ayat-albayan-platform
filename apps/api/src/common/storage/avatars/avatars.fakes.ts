import type { AvatarFiles } from './avatar-files';
import type { StaffPhotos } from './staff-photos';

// Test helpers (not a test): in-memory avatar Storage and a StaffPhotos double that counts its calls.

export class FakeAvatarFiles implements AvatarFiles {
  objects = new Map<string, { size: number; contentType: string; bytes: Uint8Array }>();
  removed: string[] = [];

  async uploadUrl(path: string) {
    return { bucket: 'avatars', path, token: 'tok', signed_url: `https://storage.test/${path}` };
  }
  async info(path: string) {
    const o = this.objects.get(path);
    return o ? { size: o.size, contentType: o.contentType } : null;
  }
  async head(path: string, bytes: number) {
    return this.objects.get(path)?.bytes.slice(0, bytes) ?? null;
  }
  /** Every batch signing call, to prove a list signs once. */
  batches: string[][] = [];
  async url(path: string) {
    return `https://storage.test/signed/${path}`;
  }
  async urls(paths: readonly string[]) {
    this.batches.push([...paths]);
    return new Map(paths.map((p) => [p, `https://storage.test/signed/${p}`]));
  }
  async remove(path: string) {
    this.removed.push(path);
    this.objects.delete(path);
  }
}

/** A StaffPhotos double: `urls` maps a teacher / profile id to its URL; `calls` proves one call per list. */
export function fakePhotos(urls: Record<string, string> = {}) {
  const calls: { method: 'ofTeachers' | 'ofProfiles'; ids: string[] }[] = [];
  const pick = (method: 'ofTeachers' | 'ofProfiles') => async (ids: readonly string[]) => {
    calls.push({ method, ids: [...ids] });
    return new Map(ids.flatMap((id) => (urls[id] ? [[id, urls[id]] as const] : [])));
  };
  const photos = { ofTeachers: pick('ofTeachers'), ofProfiles: pick('ofProfiles') } as unknown as StaffPhotos;
  return { photos, calls };
}
