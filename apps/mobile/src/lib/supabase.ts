import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/** Auth only. Data goes through the Nest API. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { storage: AsyncStorage, persistSession: true, detectSessionInUrl: false },
});
