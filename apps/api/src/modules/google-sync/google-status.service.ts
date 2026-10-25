import { GOOGLE_SCOPES, type GoogleStatusView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { googleRedirectUri, loadEnv } from '../../config/env/env';
import { readDiscovery } from './discovery';
import { GoogleData } from './google-data';
import { GOOGLE_CLIENT_FACTORY, type GoogleClientFactory } from './google-client.port';
import { GoogleMapQueries } from './google-map.queries';

/** GET /admin/google/status: the connection (never a token), settings, Drive root, counts, warnings. */
@Injectable()
export class GoogleStatusService {
  constructor(
    private readonly data: GoogleData,
    private readonly map: GoogleMapQueries,
    @Inject(GOOGLE_CLIENT_FACTORY) private readonly factory: GoogleClientFactory,
  ) {}

  async view(): Promise<GoogleStatusView> {
    const [a, settings, { counts, skips }, teacherCalendars] = await Promise.all([this.data.account.get(), this.data.settings.read(), this.data.items.counts(), this.map.mappedCalendarNames()]);
    const d = readDiscovery(a.discovery);
    return {
      configured: this.factory.oauth() !== null,
      connection: { status: a.status, email: a.email, scopes: a.scopes, connected_at: a.connected_at, last_error: a.last_error },
      settings,
      redirect_uri: googleRedirectUri(loadEnv()),
      scopes: GOOGLE_SCOPES,
      drive: { root_folder_id: a.root_folder_id, root_folder_name: a.root_folder_name, summary_sheet_id: a.summary_sheet_id, confirmed_at: a.drive_confirmed_at },
      discovery: d ? { at: d.at, calendars: d.calendars, root_folder: d.root_folder, summary_sheet: d.summary_sheet } : null,
      counts,
      warnings: { teacher_unmapped: skips.teacher_unmapped ?? 0, student_unmapped: skips.student_unmapped ?? 0, drive_unconfirmed: skips.drive_unconfirmed ?? 0 },
      targets: { main_calendar: a.email ?? 'primary', teacher_calendars: teacherCalendars },
      last_run_at: a.last_run_at,
    };
  }
}
