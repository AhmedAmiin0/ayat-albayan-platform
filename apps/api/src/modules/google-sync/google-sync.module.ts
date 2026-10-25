import { Module } from '@nestjs/common';
import { googleEnv, loadEnv } from '../../config/env/env';
import { CalendarWriter } from './writers/calendar/calendar.writer';
import { DriveFiles } from './writers/drive/drive-files';
import { GoogleAccountQueries } from './oauth/google-account.queries';
import { GoogleAdminController } from './admin/google-admin.controller';
import { GoogleAdminService } from './admin/google-admin.service';
import { GoogleAlerts } from './google-alerts';
import { GoogleCallbackController } from './oauth/google-callback.controller';
import { GOOGLE_CLIENT_FACTORY } from './google-client.port';
import { GoogleConnection } from './oauth/google-connection';
import { GoogleData } from './google-data';
import { GoogleRuntime } from './google-runtime';
import { httpFactory } from './http/google-http.client';
import { GoogleItemsController } from './admin/google-items.controller';
import { GoogleItemsQueries } from './sync/google-items.queries';
import { GoogleLogQueries } from './admin/google-log.queries';
import { GoogleMapController } from './map/google-map.controller';
import { GoogleMapQueries } from './map/google-map.queries';
import { GoogleMapService } from './map/google-map.service';
import { GoogleOAuthService } from './oauth/google-oauth.service';
import { GoogleSettings } from './google-settings';
import { GoogleStatusService } from './admin/google-status.service';
import { GoogleSyncJob } from './sync/google-sync.job';
import { GoogleSyncProcessor } from './sync/google-sync.processor';
import { GoogleSyncAcademySettings } from './sync/google-sync.settings';
import { GoogleSyncSource } from './sync/google-sync.source';
import { GoogleWriters } from './sync/google-writers';
import { ReportPdfWriter } from './writers/drive/report-pdf.writer';
import { SheetRowsWriter } from './writers/sheets/sheet-rows.writer';

/**
 * Google Calendar + Drive + Sheets sync alongside the old Apps Script (docs/24). One way only,
 * platform → Google; default OFF and dry_run. The client factory reads the Google env at call
 * time, so a client id/secret saved in «التكاملات» applies without a restart; tests override it.
 */
@Module({
  controllers: [GoogleAdminController, GoogleMapController, GoogleItemsController, GoogleCallbackController],
  providers: [
    { provide: GOOGLE_CLIENT_FACTORY, useFactory: () => httpFactory(() => googleEnv(loadEnv())) },
    GoogleAccountQueries, GoogleItemsQueries, GoogleLogQueries, GoogleMapQueries, GoogleSettings, GoogleSyncAcademySettings, GoogleSyncSource,
    GoogleData, GoogleRuntime, GoogleAlerts, GoogleConnection, DriveFiles, CalendarWriter, ReportPdfWriter, SheetRowsWriter, GoogleWriters,
    GoogleSyncProcessor, GoogleSyncJob, GoogleOAuthService, GoogleStatusService, GoogleAdminService, GoogleMapService,
  ],
})
export class GoogleSyncModule {}
