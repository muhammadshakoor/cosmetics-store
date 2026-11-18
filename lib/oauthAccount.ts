import 'server-only';
import { supabase } from './supabase';

export interface OAuthAccount {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  picture?: string;
  authVersion: number;
}

/** Call only after the OAuth provider has confirmed the email identity. */
export async function signInOAuthAccount(email: string, name: string, picture: string | null): Promise<OAuthAccount> {
  const { data, error } = await supabase.rpc('oauth_sign_in', {
    p_email: email.trim().toLowerCase(), p_name: name, p_picture: picture,
  });
  if (error || !data || typeof data.id !== 'string' || typeof data.authVersion !== 'number') {
    throw new Error('Unable to complete social sign-in.');
  }
  return data as OAuthAccount;
}
