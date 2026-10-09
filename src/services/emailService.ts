import { supabase } from '../lib/supabaseClient';

interface SendConfirmationParams {
  toEmail: string;
  movieTitle: string;
  dateTime?: string;
  seats?: string[];
}

export const emailService = {
  /**
   * Envía un correo electrónico de confirmación llamando a la Supabase Edge Function
   * 'send-ticket-confirmation' para evitar problemas de CORS y proteger la API Key de Resend.
   */
  async sendTicketConfirmation({ toEmail, movieTitle, dateTime, seats }: SendConfirmationParams): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-ticket-confirmation', {
        body: {
          toEmail,
          movieTitle,
          dateTime,
          seats
        }
      });

      if (error) {
        console.warn('La Supabase Edge Function "send-ticket-confirmation" no respondió o no está desplegada aún:', error.message);
      } else {
        console.log('Correo de confirmación procesado por Edge Function:', data);
      }
    } catch (err) {
      console.warn('No se pudo invocar el servicio de correos de Supabase:', err);
    }
  }
};
