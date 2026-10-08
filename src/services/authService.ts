import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

export const authService = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  },

  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getProfile(user.id);
  },

  async isAdmin(userId?: string): Promise<boolean> {
    if (!userId) {
      const profile = await this.getCurrentProfile();
      return (profile?.role === 'admin' || profile?.rol === 'admin');
    }
    const profile = await this.getProfile(userId);
    return (profile?.role === 'admin' || profile?.rol === 'admin');
  }
};
