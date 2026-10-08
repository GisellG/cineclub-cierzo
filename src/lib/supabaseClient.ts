import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Custom Cookie Storage adapter to keep the Supabase auth session persistent in browser cookies
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;
    const name = encodeURIComponent(key) + '=';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      c = c.trim();
      if (c.indexOf(name) === 0) {
        return decodeURIComponent(c.substring(name.length));
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;
    // Set cookie duration to 365 days
    const maxAge = 365 * 24 * 60 * 60;
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/; SameSite=Lax`;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cineclub-cierzo-auth',
    storage: cookieStorage
  }
});
