// Supabase's direct host has an IPv6 address only and hosted runners have none, so a direct url
// is sent through the session pooler, whose port keeps the driver's prepared statements working.
const DIRECT_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/;
const POOLER_HOST = 'aws-1-eu-central-1.pooler.supabase.com';
const SESSION_PORT = '5432';

export const throughPooler = (text) => {
  const url = URL.parse(text);
  const ref = url?.hostname.match(DIRECT_HOST)?.[1];
  if (!ref) return text;
  url.hostname = POOLER_HOST;
  url.port = SESSION_PORT;
  url.username = `${url.username}.${ref}`;
  return url.toString();
};
