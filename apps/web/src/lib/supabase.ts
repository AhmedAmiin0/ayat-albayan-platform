import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/** Auth only. All data goes through the Nest API (business rules + guards live there). */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
