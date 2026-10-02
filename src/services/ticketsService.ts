import { supabase } from '../lib/supabaseClient';
import { BookingTicketParams, Ticket } from '../types';

export const ticketsService = {
  // 1. Verify if the user already has a booking for that movie
  async getMyTicket(movieId: string, userId: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('movie_id', movieId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as Ticket | null;
  },

  // 2. Upload the voucher to the bucket and registry the booking into the ticket table
  async bookingTicket({ movieId, userId, fileVoucher, getMember }: BookingTicketParams): Promise<Ticket> {
    // A. Ensure user profile exists in 'profiles' table to satisfy FK constraint 'tickets_user_id_fkey'
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { data: { user } } = await supabase.auth.getUser();
      const profileData: Record<string, unknown> = {
        id: userId,
        address: '',
        role: getMember ? 'member' : 'casual'
      };
      if (user?.email) {
        profileData.email = user.email;
      }
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileErr) {
        console.error('Error creating user profile:', profileErr);
        throw new Error(`No se pudo crear el perfil de usuario: ${profileErr.message}`);
      }
    } else if (getMember) {
      await supabase
        .from('profiles')
        .update({ role: 'member' })
        .eq('id', userId);
    }

    // B. Upload image voucher into bucket 'receipt'
    const fileExt = fileVoucher.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `transferences/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipt')
      .upload(filePath, fileVoucher);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('receipt')
      .getPublicUrl(filePath);

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert([{
        movie_id: movieId,
        user_id: userId,
        recipt_url: publicUrl,
        status: 'pending'
      }])
      .select()
      .single();

    if (ticketError) throw ticketError;

    return ticket as Ticket;
  }
};
