import { supabase } from '../lib/supabaseClient';

export const ticketsService = {
  // 1. Verify if the user already has a booking for that movie
  async getMyTicket(movieId, userId) { // getMiBoleta
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('movie_id', movieId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // 2. Upload the voucher to the bucket and registry the booking into the ticket table
  async bookingTicket({ movieId, userId, fileVoucher, getMember }) { // reservarBoleta({ funcionId, userId, fileComprobante, solicitarMiembro })
    // A. Upload image voucher into bucket 'receipt'
    const fileExt = fileVoucher.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `transferences/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipt')
      .upload(filePath, fileVoucher);

    if (uploadError) throw uploadError;

    // B. Get public URL of the voucher
    const { data: { publicUrl } } = supabase.storage
      .from('receipt')
      .getPublicUrl(filePath);

    // C. Create the ticket in the DB
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

    // D. Si el usuario marcó la casilla de miembro, actualizar su perfil
    if (getMember) {
      await supabase
        .from('profiles')
        .update({ role: 'member' })
        .eq('id', userId);
    }

    return ticket;
  }
};
