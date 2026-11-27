import type {
  GoogleConnectUrl,
  GoogleDriveInput,
  GoogleReconcile,
  GoogleSettingsInput,
  GoogleStatusView,
  GoogleSyncItemView,
} from '@ab/catalog';

export interface GoogleAdminCalls {
  status: () => Promise<GoogleStatusView>;
  connect: () => Promise<GoogleConnectUrl>;
  disconnect: () => Promise<GoogleStatusView>;
  settings: (body: GoogleSettingsInput) => Promise<GoogleStatusView>;
  discover: () => Promise<GoogleStatusView>;
  drive: (body: GoogleDriveInput) => Promise<GoogleStatusView>;
  items: () => Promise<GoogleSyncItemView[]>;
  retry: (params: { id: string }) => Promise<GoogleSyncItemView>;
  reconcile: () => Promise<GoogleReconcile>;
}
