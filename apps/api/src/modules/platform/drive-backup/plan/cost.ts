// What a part costs on Drive at most: raw bytes plus the tar's own bytes (a pax header and padding
// per object, the manifest and the tail per part). zstd adds a little on bytes that do not shrink
// (PDFs, photos), so both overheads are charged generously against the night's budget.

const PER_OBJECT_BYTES = 4096;
const PER_PART_BYTES = 1024 * 1024;

/** One object inside a part. */
export const objectCost = (o: { size: number }): number => o.size + o.size / 256 + PER_OBJECT_BYTES;

/** A whole part (archive file) of these objects. */
export const partCost = (objects: readonly { size: number }[]): number =>
  objects.reduce((n, o) => n + objectCost(o), PER_PART_BYTES);
