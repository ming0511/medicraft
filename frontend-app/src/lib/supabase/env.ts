import { env } from '$env/dynamic/public';

export const SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
