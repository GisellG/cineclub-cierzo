import { supabase } from '../lib/supabaseClient';
import { BookingTicketParams, Ticket } from '../types';
import { emailService } from './emailService';

const parseSeatsHelper = (seatsData: unknown): string[] => {
  if (!seatsData) return [];
  if (Array.isArray(seatsData)) return seatsData.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  if (typeof seatsData === 'string') {
    let str = seatsData.trim();
    if (str.startsWith('{') && str.endsWith('}')) str = str.slice(1, -1);
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
    } catch {
      // not JSON
    }
    return str.split(',').map((s) => s.trim().replace(/['"]/g, '').toUpperCase()).filter(Boolean);
  }
  return [];
};

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
  async bookingTicket({ movieId, userId, fileVoucher, getMember, seats }: BookingTicketParams): Promise<Ticket> {
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
        status: 'pending',
        ...(seats && seats.length > 0 ? { seats } : {})
      }])
      .select()
      .single();

    if (ticketError) throw ticketError;

    return ticket as Ticket;
  },

  // 3. Fetch pending tickets for admin approval
  async getPendingTickets(): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        movie_screening ( id, title, date_time, poster_url ),
        profiles ( id, email, role )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Ticket[];
  },

  // 4. Update ticket status (approve / reject)
  async updateTicketStatus(ticketId: string, status: 'confirmed' | 'rejected'): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)
      .select(`
        *,
        movie_screening ( id, title, date_time, poster_url ),
        profiles ( id, email, role )
      `)
      .single();

    if (error) throw new Error(`Error al actualizar el estado de la boleta: ${error.message}`);
    const ticket = data as Ticket;

    if (status === 'confirmed' && ticket.profiles?.email) {
      const seatsList = parseSeatsHelper(ticket.seats);
      await emailService.sendTicketConfirmation({
        toEmail: ticket.profiles.email,
        movieTitle: ticket.movie_screening?.title || 'Función de Cineclub',
        dateTime: ticket.movie_screening?.date_time,
        seats: seatsList
      });
    }

    return ticket;
  }
};
