import { supabase } from '../lib/supabaseClient';

export const boletasService = {
  // 1. Verificar si el vecino ya tiene una reserva para esta función
  async getMiBoleta(funcionId, userId) {
    const { data, error } = await supabase
      .from('boletas')
      .select('*')
      .eq('funcion_id', funcionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // 2. Subir comprobante al Bucket y registrar la reserva en la tabla boletas
  async reservarBoleta({ funcionId, userId, fileComprobante, solicitarMiembro }) {
    // A. Subir imagen al Bucket 'comprobantes'
    const fileExt = fileComprobante.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `transferencias/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, fileComprobante);

    if (uploadError) throw uploadError;

    // B. Obtener URL pública de la captura
    const { data: { publicUrl } } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);

    // C. Crear la boleta en la base de datos
    const { data: boleta, error: boletaError } = await supabase
      .from('boletas')
      .insert([{
        funcion_id: funcionId,
        user_id: userId,
        comprobante_url: publicUrl,
        estado: 'pendiente'
      }])
      .select()
      .single();

    if (boletaError) throw boletaError;

    // D. Si el usuario marcó la casilla de miembro, actualizar su perfil
    if (solicitarMiembro) {
      await supabase
        .from('profiles')
        .update({ rol: 'miembro' })
        .eq('id', userId);
    }

    return boleta;
  }
};
