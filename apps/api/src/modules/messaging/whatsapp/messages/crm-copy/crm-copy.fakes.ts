import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import type { AuditService } from '../../../../../common/audit/audit.service';
import type { SettingsService } from '../../../../../common/settings/settings.service';
import type { StorageService } from '../../../../../common/storage/storage.service';
import type { WhatsappLines } from '../../whatsapp.types';
import { CrmHistoryMedia } from '../crm-history/crm-history-media';
import { CRM_HOST, crmLink, crmRow } from '../crm-history/crm-history.fakes';
import { CRM_MEDIA_PREFIX } from '../crm-history/crm-history-url';
import { CrmMediaSettings } from '../crm-history/crm-media.settings';
import type { InboundMediaQueries, MediaMessage } from '../inbound-media.queries';
import { InboundMedia } from '../inbound-media.service';
import { CrmMediaCopier } from './crm-media-copier';
import { CrmMediaCopyDone } from './crm-media-copy.done';
import { CrmMediaCopyJob } from './crm-media-copy.job';
import type { CrmMediaCopyQueries } from './crm-media-copy.queries';
import { CrmMediaCopySettings } from './crm-media-copy.settings';

/** Tests only: `n` imported CRM voice notes (no media id, no copy, the body only the link). */
export const crmRows = (n: number, from = 0): MediaMessage[] =>
  Array.from({ length: n }, (_, i) =>
    crmRow({ id: `c${from + i}`, media_mime: 'audio/ogg', body: crmLink(`v${from + i}.ogg`), created_at: `2026-08-01T00:${String(i % 60).padStart(2, '0')}:00Z` }),
  );

type Failure = { attempts: number; skipped: boolean };

/** Tests only: migration 880's three functions over in-memory rows (the same WHERE, in TypeScript). */
function fakeCopyQueries(rows: Map<string, MediaMessage>, failures: Map<string, Failure>) {
  const linkOn = (m: MediaMessage, host: string) => !!m.body?.startsWith(`https://${host.toLowerCase()}${CRM_MEDIA_PREFIX}`);
  return {
    batch: vi.fn(async (q: { host: string; limit: number; maxAttempts: number }) =>
      [...rows.values()]
        .filter((m) => m.direction === 'inbound' && !m.media_id && !m.media_path && !!m.media_mime && linkOn(m, q.host))
        .filter((m) => m.number?.provider === 'crm')
        .filter((m) => !failures.get(m.id)?.skipped && (failures.get(m.id)?.attempts ?? 0) < q.maxAttempts)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        .slice(0, q.limit)
        .map((m) => m.id),
    ),
    mark: vi.fn(async (q: { id: string; skip: boolean }) => {
      const was = failures.get(q.id);
      const next = { attempts: (was?.attempts ?? 0) + 1, skipped: !!was?.skipped || q.skip };
      failures.set(q.id, next);
      return next.attempts;
    }),
    counts: vi.fn(async (host: string) => {
      const left = (skipped: boolean) => [...failures].filter(([id, f]) => f.skipped === skipped && !rows.get(id)?.media_path).length;
      const copied = [...rows.values()].filter((m) => m.direction === 'inbound' && !m.media_id && !!m.media_path && linkOn(m, host)).length;
      return { copied, failed: left(false), skipped: left(true) };
    }),
  };
}

/** Tests only: a settings store holding `values`; writeSwitch writes into it (the job's turnOff). */
function liveStore(values: Partial<AcademySettings>) {
  const state: AcademySettings = { ...SETTING_DEFAULTS, ...values };
  const writeSwitch = vi.fn(async (key: string, value: boolean | string) => void Object.assign(state, { [key]: value }));
  const store = { all: vi.fn(async () => ({ ...state })), writeSwitch };
  return { state, writeSwitch, store: store as unknown as SettingsService };
}

/**
 * Tests only: the job wired to a real InboundMedia / CrmHistoryMedia (fetch stubbed by the test),
 * in-memory messages, wa-media and failures. Defaults: the switch on and the host set.
 */
export function copyWorld(seed: MediaMessage[], values: Partial<AcademySettings> = {}) {
  const rows = new Map(seed.map((m) => [m.id, m]));
  const failures = new Map<string, Failure>();
  const inbound = {
    message: vi.fn(async (id: string) => rows.get(id) ?? null),
    setPath: vi.fn(async (id: string, path: string) => {
      const m = rows.get(id);
      if (m && !m.media_path) rows.set(id, { ...m, media_path: path });
    }),
  };
  const objects = new Map<string, number>();
  const storage = { upload: vi.fn(async (o: { path: string; body: Uint8Array }) => void objects.set(o.path, o.body.byteLength)) };
  const client = { configured: vi.fn(() => true), getMedia: vi.fn() };
  const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
  const settings = liveStore({ crm_media_copy_all: true, crm_media_host: CRM_HOST, ...values });
  const media = new InboundMedia(inbound as unknown as InboundMediaQueries, lines, storage as unknown as StorageService);
  Object.assign(media, { crm: new CrmHistoryMedia(new CrmMediaSettings(settings.store)) });
  const queries = fakeCopyQueries(rows, failures);
  const copyQueries = queries as unknown as CrmMediaCopyQueries;
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const copySettings = new CrmMediaCopySettings(settings.store);
  const copier = new CrmMediaCopier(media, copyQueries);
  const done = new CrmMediaCopyDone(copyQueries, copySettings, audit as unknown as AuditService);
  const job = new CrmMediaCopyJob(copySettings, copier, done);
  return { job, copier, rows, failures, objects, storage, queries, audit, client, settings, inbound };
}
