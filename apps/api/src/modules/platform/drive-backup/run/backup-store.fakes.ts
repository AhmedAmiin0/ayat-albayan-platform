import type { ArchiveRow } from '@/modules/platform/drive-backup/plan/archive.types';
import { objectId } from '@/modules/platform/drive-backup/plan/parts';
import type { BackupStore, FinishedArchive, NewArchive } from './backup-store.port';

type Row = ArchiveRow & NewArchive & { error: string | null; objects: FinishedArchive['entries'] };

/** drive_backup_* in memory. `today` is the night being run (started_at follows it). */
export class MemoryStore implements BackupStore {
  readonly rows: Row[] = [];
  today = new Date('2026-11-07T01:00:00Z');
  private seq = 0;

  abandon(folderId: string) {
    for (const r of this.rows.filter((x) => x.folderId === folderId && x.status === 'uploading')) {
      Object.assign(r, { status: 'failed', error: 'interrupted' });
    }
    return Promise.resolve();
  }

  archives(folderId: string) {
    const live = this.rows.filter((r) => r.folderId === folderId && r.status !== 'trashed');
    return Promise.resolve(live.map((r) => ({ ...r })));
  }

  covered(archives: readonly ArchiveRow[]) {
    const out = new Map<string, string>();
    const ids = new Set(archives.map((a) => a.id));
    for (const r of this.rows.filter((x) => ids.has(x.id))) {
      r.objects.forEach((o) => out.set(objectId(o), o.etag));
    }
    return Promise.resolve(out);
  }

  lastPart(input: Pick<NewArchive, 'folderId' | 'kind' | 'label'>) {
    const same = (r: Row) =>
      r.folderId === input.folderId && r.kind === input.kind && r.label === input.label;
    return Promise.resolve(Math.max(0, ...this.rows.filter(same).map((r) => r.part)));
  }

  /** Like the table's unique (folder_id, kind, label, part), trashed rows included. */
  start(input: NewArchive) {
    const same = (r: Row) =>
      r.folderId === input.folderId && r.kind === input.kind && r.label === input.label;
    if (this.rows.some((r) => same(r) && r.part === input.part)) throw new Error('duplicate part');
    this.seq += 1;
    const id = `archive-${this.seq}`;
    const started_at = new Date(this.today.getTime() + this.seq).toISOString();
    const base = { status: 'uploading' as const, sealed: false, drive_file_id: null, error: null };
    this.rows.push({ ...input, ...base, id, started_at, objects: [] });
    return Promise.resolve(id);
  }

  uploaded(input: { id: string; fileId: string }) {
    return this.own(input.id, { drive_file_id: input.fileId });
  }

  finish(input: FinishedArchive) {
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
    const r = this.row(id);
    if (r.status !== 'uploading') return Promise.reject(new Error('not uploading'));
    Object.assign(r, patch);
    return Promise.resolve();
  }

  seal(id: string) {
    this.row(id).sealed = true;
    return Promise.resolve();
  }

  trashed(ids: readonly string[]) {
    ids.forEach((id) => Object.assign(this.row(id), { status: 'trashed', objects: [] }));
    return Promise.resolve();
  }

  private row(id: string): Row {
    const r = this.rows.find((x) => x.id === id);
    if (!r) throw new Error(`no archive ${id}`);
    return r;
  }
}
