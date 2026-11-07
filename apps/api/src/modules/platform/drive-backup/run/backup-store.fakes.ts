import { versionId } from '@/modules/platform/drive-backup/plan/parts';
import type { BackupStore, FinishedArchive, NewArchive } from './backup-store.port';

type Status = 'uploading' | 'done' | 'failed';
interface Row extends NewArchive {
  id: string;
  status: Status;
  drive_file_id: string | null;
  error: string | null;
  objects: FinishedArchive['entries'];
}

/** drive_backup_* in memory (add-only: rows are never removed). */
export class MemoryStore implements BackupStore {
  readonly rows: Row[] = [];
  /** drive_backup_objects: folder → recorded versions. */
  readonly recorded = new Map<string, Set<string>>();
  private seq = 0;

  abandon(folderId: string) {
    for (const r of this.rows.filter((x) => x.folderId === folderId && x.status === 'uploading')) {
      Object.assign(r, { status: 'failed', error: 'interrupted' });
    }
    return Promise.resolve();
  }

  covered(folderId: string) {
    return Promise.resolve(new Set(this.recorded.get(folderId) ?? []));
  }

  lastPart(input: Pick<NewArchive, 'folderId' | 'label'>) {
    const same = (r: Row) => r.folderId === input.folderId && r.label === input.label;
    return Promise.resolve(Math.max(0, ...this.rows.filter(same).map((r) => r.part)));
  }

  /** Like the table's unique (folder_id, label, part). */
  start(input: NewArchive) {
    const same = (r: Row) => r.folderId === input.folderId && r.label === input.label;
    if (this.rows.some((r) => same(r) && r.part === input.part)) throw new Error('duplicate part');
    this.seq += 1;
    const id = `archive-${this.seq}`;
    const base = { status: 'uploading' as const, drive_file_id: null, error: null, objects: [] };
    this.rows.push({ ...input, ...base, id });
    return Promise.resolve(id);
  }

  uploaded(input: { id: string; fileId: string }) {
    return this.own(input.id, { drive_file_id: input.fileId });
  }

  /** Like the repo: the objects first, then `done`. */
  finish(input: FinishedArchive) {
    const set = this.recorded.get(input.folderId) ?? new Set<string>();
    input.entries.forEach((e) => set.add(versionId(e)));
    this.recorded.set(input.folderId, set);
    return this.own(input.id, {
      status: 'done',
      drive_file_id: input.fileId,
      objects: input.entries,
    });
  }

  fail(input: { id: string; error: string; fileId?: string }) {
    const file = input.fileId === undefined ? {} : { drive_file_id: input.fileId };
    return this.own(input.id, { status: 'failed', error: input.error, ...file });
  }

  /** Like the repo: only a row still `uploading`; otherwise an error. */
  private own(id: string, patch: Partial<Row>): Promise<void> {
    const r = this.rows.find((x) => x.id === id);
    if (r?.status !== 'uploading') return Promise.reject(new Error('not uploading'));
    Object.assign(r, patch);
    return Promise.resolve();
  }
}
