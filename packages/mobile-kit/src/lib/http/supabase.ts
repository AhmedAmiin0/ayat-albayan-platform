import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from './env';
import { authFetch } from './auth-fetch';

/** Auth only. Data goes through the Nest API. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { storage: AsyncStorage, persistSession: true, detectSessionInUrl: false },
  global: { fetch: authFetch },
});

// Supabase's React Native recipe: refresh the token only while the app is in the foreground (JS
// timers sleep in the background anyway); back to 'active', one refresh tick runs at once.
AppState.addEventListener('change', (state) => {
  void (state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
});
