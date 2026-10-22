import { Module } from '@nestjs/common';
import { googleEnv, loadEnv } from '../../env';
import { CalendarWriter } from './calendar.writer';
import { DriveFiles } from './drive-files';
import { GoogleAccountQueries } from './google-account.queries';
import { GoogleAdminController } from './google-admin.controller';
import { GoogleAdminService } from './google-admin.service';
import { GoogleAlerts } from './google-alerts';
import { GoogleCallbackController } from './google-callback.controller';
import { GOOGLE_CLIENT_FACTORY } from './google-client.port';
import { GoogleConnection } from './google-connection';
import { GoogleData } from './google-data';
import { GoogleRuntime } from './google-runtime';
import { httpFactory } from './google-http.client';
import { GoogleItemsController } from './google-items.controller';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleLogQueries } from './google-log.queries';
import { GoogleMapController } from './google-map.controller';
import { GoogleMapQueries } from './google-map.queries';
import { GoogleMapService } from './google-map.service';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleSettings } from './google-settings';
import { GoogleStatusService } from './google-status.service';
import { GoogleSyncJob } from './google-sync.job';
import { GoogleSyncProcessor } from './google-sync.processor';
import { GoogleSyncSource } from './google-sync.source';
import { GoogleWriters } from './google-writers';
import { ReportPdfWriter } from './report-pdf.writer';
import { SheetRowsWriter } from './sheet-rows.writer';

/**
 * Google Calendar + Drive + Sheets sync alongside the old Apps Script (docs/24). One way only,
 * platform → Google; default OFF and dry_run. The client factory reads the Google env at call
 * time, so a client id/secret saved in «التكاملات» applies without a restart; tests override it.
 */
@Module({
  controllers: [GoogleAdminController, GoogleMapController, GoogleItemsController, GoogleCallbackController],
  providers: [
    { provide: GOOGLE_CLIENT_FACTORY, useFactory: () => httpFactory(() => googleEnv(loadEnv())) },
    GoogleAccountQueries, GoogleItemsQueries, GoogleLogQueries, GoogleMapQueries, GoogleSettings, GoogleSyncSource,
    GoogleData, GoogleRuntime, GoogleAlerts, GoogleConnection, DriveFiles, CalendarWriter, ReportPdfWriter, SheetRowsWriter, GoogleWriters,
    GoogleSyncProcessor, GoogleSyncJob, GoogleOAuthService, GoogleStatusService, GoogleAdminService, GoogleMapService,
  ],
})
export class GoogleSyncModule {}
