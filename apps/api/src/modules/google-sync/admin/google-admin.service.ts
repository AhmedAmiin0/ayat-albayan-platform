import type { GoogleDriveInput, GoogleSettingsInput } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import type { Json } from '@ab/db';
import { classify } from '../http/backoff';
import { discover, readDiscovery } from '../map/discovery';
import { GoogleData } from '../google-data';
import { GoogleRuntime } from '../google-runtime';
import { GOOGLE_ENTITY_ID } from '../oauth/google-oauth.service';

/** The admin's actions on the sync: settings, discovery, the Drive root. Each one re-queues what it unblocks. */
@Injectable()
export class GoogleAdminService {
  constructor(
    private readonly data: GoogleData,
    private readonly run: GoogleRuntime,
  ) {}

  private record(input: { actorId: string; action: string; after: Json }): Promise<void> {
    return this.run.audit.record({ actorId: input.actorId, entity: 'google_account', entityId: GOOGLE_ENTITY_ID, action: input.action, before: null, after: input.after });
  }

  /** Going live re-queues the dry-run items; turning on queues the window. Nothing in a routine calls this. */
  async saveSettings(input: { values: GoogleSettingsInput; actorId: string }): Promise<void> {
    const before = await this.data.settings.read();
    await this.data.settings.write(input);
    const after = await this.data.settings.read();
    await this.record({ actorId: input.actorId, action: 'settings', after: { ...after } });
    if (after.enabled && after.mode === 'live' && (before.mode !== 'live' || !before.enabled)) await this.data.items.requeue('dry_run');
    if (after.enabled && (!before.enabled || after.window_days !== before.window_days)) await this.run.job.reconcile();
    void this.run.job.kick();
  }

  async discover(): Promise<void> {
    const google = await this.run.connection.client();
    if (!google) throw new ConflictException({ message: 'not_connected' });
    try {
      const found = await discover(google);
      await this.data.account.update({ discovery: found as unknown as Json });
    } catch (e) {
      const cls = classify(e);
      if (cls === 'auth') {
        await this.run.connection.authFailed();
        throw new ConflictException({ message: 'not_connected' });
      }
      if (cls === 'config') {
        await this.run.connection.configFailed();
        throw new ConflictException({ message: 'invalid_client' });
      }
      throw e;
    }
  }

  /** Confirm the root folder (and summary sheet) — only ones discovery found. */
  async confirmDrive(input: { values: GoogleDriveInput; actorId: string }): Promise<void> {
    const d = readDiscovery((await this.data.account.get()).discovery);
    const root = d?.root_folder?.id === input.values.root_folder_id ? d.root_folder : null;
    const sheetOk = input.values.summary_sheet_id === null || d?.summary_sheet?.id === input.values.summary_sheet_id;
    if (!root || !sheetOk) throw new ConflictException({ message: 'not_discovered' });
    await this.data.account.update({
      root_folder_id: root.id, root_folder_name: root.name, summary_sheet_id: input.values.summary_sheet_id,
      drive_confirmed_at: new Date().toISOString(), drive_confirmed_by: input.actorId,
    });
    await this.record({ actorId: input.actorId, action: 'drive_confirm', after: { root_folder_id: root.id } });
    await this.data.items.requeue('drive_unconfirmed');
    void this.run.job.kick();
  }
}
