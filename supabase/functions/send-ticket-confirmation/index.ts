// @ts-nocheck
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejo de Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { toEmail, movieTitle, dateTime, seats } = await req.json();

    if (!toEmail || !movieTitle) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos (toEmail, movieTitle)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const seatsText = seats && seats.length > 0 ? seats.join(', ') : 'General / Sin numerar';
    const dateText = dateTime || 'Próxima función';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Cineclub Vecinal <team@cierzocineclub.cc>',
        to: [toEmail],
        subject: `🍿 ¡Entradas confirmadas para "${movieTitle}"!`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #f43f5e; font-size: 24px; margin: 0;">¡Reserva Aprobada!</h1>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">El administrador ha verificado tu pago.</p>
            </div>

            <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
              <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                ${movieTitle}
              </h2>
              <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;">
                <strong>📅 Fecha / Hora:</strong> ${dateText}
              </p>
              <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;">
                <strong>🎟️ Asientos / Entradas:</strong> ${seatsText}
              </p>
            </div>

            <p style="font-size: 13px; color: #94a3b8; text-align: center; line-height: 1.5;">
              Presenta este correo o menciona tu email al ingresar a la sala.<br/>
              ¡Te esperamos para disfrutar la función!
            </p>

            <div style="text-align: center; margin-top: 28px; padding-top: 16px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
              Cineclub Vecinal Cierzo — team@cierzocineclub.cc
            </div>
          </div>
        `,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(data.message || 'Error al enviar mediante Resend');
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
