import {
  needsTypedConfirm,
  settingZod,
  typedConfirmMatches,
  type ConfigDescriptionInput,
  type ConfigEntry,
  type ConfigEntryPatchInput,
  type ConfigEntryResult,
  type SeedEntry,
  type SettingDef,
} from '@ab/shared';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../auth/verify-token';
import { CONFIG_KEYS, configDef, seedEntryOf } from '../store/config-defs';
import { decodeValue } from '../store/config-decode';
import { ConfigEntriesAudit } from './config-entries.audit';
import { confirmationRequired, invalidValue, ownedByModule, ownerPermission, unknownKey } from './config-entries.errors';
import { toConfigEntry, toConflict } from './config-entries.mapper';
import { isModuleOwned, mayDescribe, mayView, ownerOf } from '../boundaries/config-ownership';
import { ConfigStore } from '../store/config-store.service';
import { ConfigConflictError, neverWritten, type ConfigSnapshot } from '../config-store.types';

interface EntryCall<B> {
  key: string;
  body: B;
  user: AuthUser;
}

interface Known {
  seed: SeedEntry;
  def: SettingDef;
}

function known(key: string): Known {
  const seed = seedEntryOf(key);
  const def = configDef(key);
  if (!seed || !def) throw unknownKey();
  return { seed, def };
}

/** «القيم» (docs/26 §2f): list, per-key value save and description edit over ConfigStore. */
@Injectable()
export class ConfigEntriesService {
  private readonly log = new Logger(ConfigEntriesService.name);

  constructor(
    private readonly store: ConfigStore,
    private readonly audit: ConfigEntriesAudit,
  ) {}

  /** Every SEED_ENTRIES key merged with its row; the Google rows only for base admins. */
  async list(user: AuthUser): Promise<ConfigEntry[]> {
    const snap = await this.store.snapshot();
    return this.entries(snap, CONFIG_KEYS.filter((k) => mayView(user, k)));
  }

  /** 404 unknown_key · 409 owned_by_module · 422 invalid · 428 confirmation_required · 409 conflict. */
  async patch(call: EntryCall<ConfigEntryPatchInput>): Promise<ConfigEntryResult> {
    const { seed, def } = known(call.key);
    if (isModuleOwned(call.key)) throw ownedByModule(ownerOf(call.key));
    const parsed = settingZod(def).safeParse(call.body.value);
    if (!parsed.success) throw invalidValue(parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    const value: unknown = parsed.data;
    const snap = await this.store.fresh();
    const row = snap.rows.find((r) => r.key === call.key);
    const prev = decodeValue(call.key, def, row).value;
    if (needsTypedConfirm(seed.confirm, value, prev) && !typedConfirmMatches(value, call.body.confirmText)) {
      throw confirmationRequired();
    }
    if ((row?.version ?? 0) !== call.body.expectedVersion) throw await this.conflict(call.key, snap);
    try {
      await this.store.set([{ key: call.key, value, expectedVersion: call.body.expectedVersion }], call.user.id);
    } catch (e) {
      if (e instanceof ConfigConflictError) throw await this.conflict(call.key, await this.store.fresh());
      throw e;
    }
    await this.audited(() => this.audit.value({ actorId: call.user.id, key: call.key, before: prev, after: value }));
    return { entry: await this.entry(call.key) };
  }

  /** null restores the seeded text. An owned key also needs its module's permission (403). */
  async describe(call: EntryCall<ConfigDescriptionInput>): Promise<ConfigEntryResult> {
    known(call.key);
    if (!mayDescribe(call.user, call.key)) throw ownerPermission(ownerOf(call.key));
    const before = (await this.store.fresh()).rows.find((r) => r.key === call.key)?.description ?? null;
    await this.store.describe({ key: call.key, text: call.body.text, actorId: call.user.id });
    const after = call.body.text;
    await this.audited(() => this.audit.description({ actorId: call.user.id, key: call.key, before, after }));
    return { entry: await this.entry(call.key) };
  }

  private async entry(key: string): Promise<ConfigEntry> {
    const [entry] = await this.entries(await this.store.fresh(), [key]);
    if (!entry) throw unknownKey();
    return entry;
  }

  private async conflict(key: string, snap: ConfigSnapshot): Promise<ConflictException> {
    const [entry] = await this.entries(snap, [key]);
    if (!entry) return new ConflictException({ code: 'conflict', message: 'conflict', key });
    return new ConflictException(toConflict(entry));
  }

  private async entries(snap: ConfigSnapshot, keys: readonly string[]): Promise<ConfigEntry[]> {
    const rows = new Map(snap.rows.map((r) => [r.key, r]));
    const writers = keys.flatMap((k) => {
      const r = rows.get(k);
      return r?.updatedBy && !neverWritten(r) ? [r.updatedBy] : [];
    });
    const names = await this.store.names(writers);
    return keys.flatMap((key) => {
      const seed = seedEntryOf(key);
      const def = configDef(key);
      if (!seed || !def) return [];
      const row = rows.get(key);
      return [toConfigEntry({ seed, def, row, value: decodeValue(key, def, row).value }, names)];
    });
  }

  /** The write already happened: a failed audit row is logged, never turned into an error answer. */
  private async audited(write: () => Promise<void>): Promise<void> {
    try {
      await write();
    } catch (e) {
      this.log.error(`config entry audit failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
