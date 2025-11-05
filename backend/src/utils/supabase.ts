import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Public client (for auth)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

// Admin client (for service operations)
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string) {
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    throw new Error('Invalid or expired token');
  }
  
  return data.user;
}

/**
 * Verify admin user
 */
export async function verifyAdmin(token: string): Promise<boolean> {
  const user = await getUserFromToken(token);
  
  // Check if user has admin role in metadata
  return user.user_metadata?.role === 'admin' || user.email === env.ADMIN_EMAIL;
}

