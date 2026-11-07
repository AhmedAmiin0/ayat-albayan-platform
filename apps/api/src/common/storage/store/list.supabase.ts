import type { Db } from '@/common/db/db.module';

// Supabase Storage lists one folder at a time (a folder is a row with no id); walk them all.

type BucketApi = ReturnType<Db['storage']['from']>;

const PAGE = 1000;

async function page(api: BucketApi, input: { folder: string; offset: number }) {
  const { data, error } = await api.list(input.folder, { limit: PAGE, offset: input.offset });
  if (error) throw new Error(`storage list failed: ${error.message}`);
  return data;
}

/** One folder, every page: its object keys and its sub-folders. */
async function folderOf(api: BucketApi, folder: string) {
  const at = (name: string) => (folder ? `${folder}/${name}` : name);
  const rows: { id: string | null; name: string }[] = [];
  for (let offset = 0, more = true; more; offset += PAGE) {
    const got = await page(api, { folder, offset });
    rows.push(...got);
    more = got.length === PAGE;
  }
  const keys = rows.filter((r) => r.id).map((r) => at(r.name));
  return { keys, folders: rows.filter((r) => !r.id).map((r) => at(r.name)) };
}

/** Every object key under `prefix` (a folder path, '' for the bucket root). */
export async function listAll(api: BucketApi, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const folders = [prefix.replace(/\/+$/, '')];
  for (let folder = folders.pop(); folder !== undefined; folder = folders.pop()) {
    const got = await folderOf(api, folder);
    out.push(...got.keys);
    folders.push(...got.folders);
  }
  return out;
}
