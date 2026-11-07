import type { Db } from '@/common/db/db.module';
import { loadEnv } from '@/config/env/env';
import { storageEnv } from '@/config/env/env.storage';
import { SupabaseStore } from './objects.supabase';
import { minioStore } from './s3-client';
import { StoreSource } from './store-source';

/** The app's adapters: Supabase through the DB client, MinIO from the current config. */
export const defaultSource = (db: Db): StoreSource =>
  new StoreSource({
    supabase: new SupabaseStore(db),
    config: () => storageEnv(loadEnv()),
    minio: minioStore,
  });
