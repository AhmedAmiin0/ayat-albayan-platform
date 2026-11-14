/** Public config only (EXPO_PUBLIC_* is inlined at build time). */
export const env = {
  supabaseUrl: process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:54321',
  supabaseAnonKey: process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
  apiUrl: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000',
};
