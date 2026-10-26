/**
 * The pay-with-receipt rule of every payment form (docs/27 E4): a file goes up once. The last upload's
 * storage path is kept by its key (the File, a photo's uri, or scope + uri): a retry after a failed or
 * lost POST re-sends that path instead of uploading the file again; another file is uploaded anew.
 * A failed upload keeps nothing, so the next try uploads again.
 */
export function uploadOnce<K>(): (key: K, upload: () => Promise<string>) => Promise<string> {
  let last: { key: K; path: string } | null = null;
  return async (key, upload) => {
    if (last && last.key === key) return last.path;
    const path = await upload();
    last = { key, path };
    return path;
  };
}
