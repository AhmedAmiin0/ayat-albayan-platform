function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}; run \`pnpm env:local\``);
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env['VITE_SUPABASE_URL']),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env['VITE_SUPABASE_ANON_KEY']),
  apiUrl: required('VITE_API_URL', import.meta.env['VITE_API_URL']),
};
