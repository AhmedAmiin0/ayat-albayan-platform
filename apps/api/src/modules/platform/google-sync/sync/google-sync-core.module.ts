import { Module } from '@nestjs/common';
import { googleEnv, loadEnv } from '@/config/env/env';
import { GoogleAlerts } from '@/modules/platform/google-sync/google-alerts';
import { GOOGLE_CLIENT_FACTORY } from '@/modules/platform/google-sync/google-client.port';
import { GoogleData } from '@/modules/platform/google-sync/google-data';
import { GoogleRuntime } from '@/modules/platform/google-sync/google-runtime';
import { GoogleSettings } from '@/modules/platform/google-sync/google-settings';
import { httpFactory } from '@/modules/platform/google-sync/http/google-http.client';
import { GoogleMapQueries } from '@/modules/platform/google-sync/map/google-map.queries';
import { GoogleAccountQueries } from '@/modules/platform/google-sync/oauth/google-account.queries';
import { GoogleConnection } from '@/modules/platform/google-sync/oauth/google-connection';
import { CalendarWriter } from '@/modules/platform/google-sync/writers/calendar/calendar.writer';
import { DriveFiles } from '@/modules/platform/google-sync/writers/drive/drive-files';
import { ReportPdfWriter } from '@/modules/platform/google-sync/writers/drive/report-pdf.writer';
import { SheetRowsWriter } from '@/modules/platform/google-sync/writers/sheets/sheet-rows.writer';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleSyncJob } from './google-sync.job';
import { GoogleSyncProcessor } from './google-sync.processor';
import { GoogleSyncAcademySettings } from './google-sync.settings';
import { GoogleSyncSource } from './google-sync.source';
import { GoogleWriters } from './google-writers';

const clientFactory = {
  provide: GOOGLE_CLIENT_FACTORY,
  useFactory: () => httpFactory(() => googleEnv(loadEnv())),
};

/** The sync engine and its connection, shared by the oauth, admin and map routes (docs/24). */
@Module({
  providers: [
    clientFactory,
    ...[GoogleAccountQueries, GoogleItemsQueries, GoogleMapQueries, GoogleSettings],
    ...[GoogleSyncAcademySettings, GoogleSyncSource, GoogleData, GoogleRuntime, GoogleAlerts],
    ...[GoogleConnection, DriveFiles, CalendarWriter, ReportPdfWriter, SheetRowsWriter],
    ...[GoogleWriters, GoogleSyncProcessor, GoogleSyncJob],
  ],
  exports: [
    ...[GOOGLE_CLIENT_FACTORY, GoogleData, GoogleRuntime, GoogleMapQueries],
    ...[GoogleItemsQueries, GoogleSyncJob, GoogleConnection],
  ],
})
export class GoogleSyncCoreModule {}
