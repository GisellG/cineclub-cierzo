import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Ticket, Sparkles, CheckCircle2, Clock3, AlertCircle, Film } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function FuncionActiva({ user, onReservarClick }) {
  const [funcion, setFuncion] = useState(null);
  const [miBoleta, setMiBoleta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarFuncionYReserva();
  }, [user]);

  const cargarFuncionYReserva = async () => {
    setLoading(true);
    try {
      // 1. Consultar la próxima función en cartelera
      const { data: funcionData, error } = await supabase
        .from('funciones')
        .select(`
          *,
          ciclos ( titulo ),
          boletas ( id, user_id, estado )
        `)
        .gte('fecha_hora', new Date().toISOString())
        .order('fecha_hora', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setFuncion(funcionData);

      // 2. Si hay un usuario conectado, verificar si ya tiene reserva registrada
      if (user && funcionData) {
        const boletaUsuario = funcionData.boletas?.find(b => b.user_id === user.id && b.estado !== 'rechazada');
        setMiBoleta(boletaUsuario || null);
      } else {
        setMiBoleta(null);
      }
    } catch (err) {
      console.error('Error al cargar la función:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3 animate-pulse">
        <Film className="mx-auto text-slate-700" size={40} />
        <p className="text-sm font-medium">Cargando la función de la semana...</p>
      </div>
    );
  }

  if (!funcion) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-2">
        <Film className="mx-auto text-slate-600 opacity-50" size={48} />
        <h3 className="text-lg font-bold text-slate-300">No hay funciones programadas</h3>
        <p className="text-xs text-slate-500">Pronto el administrador publicará la película del próximo ciclo.</p>
      </div>
    );
  }

  // Cálculos de aforo
  const boletasValidas = funcion.boletas?.filter(b => b.estado !== 'rechazada') || [];
  const ocupados = boletasValidas.length;
  const maximo = funcion.cupo_maximo;
  const porcentajeAforo = Math.min(100, Math.round((ocupados / maximo) * 100));
  const aforoAgotado = ocupados >= maximo;
  const fecha = new Date(funcion.fecha_hora);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="grid md:grid-cols-5 gap-0">
        
        {/* Columna Izquierda: Poster / Ilustración */}
        <div className="md:col-span-2 bg-slate-950 min-h-[220px] flex items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800">
          {funcion.poster_url ? (
            <img 
              src={funcion.poster_url} 
              alt={funcion.titulo} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Film size={56} className="mx-auto text-slate-700" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cineclub Vecinal</p>
            </div>
          )}

          {funcion.ciclos?.titulo && (
            <span className="absolute top-3 left-3 bg-slate-950/90 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur flex items-center gap-1.5">
              <Sparkles size={13} />
              {funcion.ciclos.titulo}
            </span>
          )}
        </div>

        {/* Columna Derecha: Información y Acción */}
        <div className="md:col-span-3 p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Próxima Función</span>
            <h2 className="text-2xl font-extrabold text-white">{funcion.titulo}</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{funcion.descripcion}</p>
          </div>

          {/* Ficha técnica rápida */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Calendar size={15} className="text-rose-500" />
              <span>{fecha.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={15} className="text-rose-500" />
              <span>{fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({funcion.duracion_minutos}m)</span>
            </div>
          </div>

          {/* Barra de Aforo Dinámica */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">{ocupados} de {maximo} sillas ocupadas</span>
              <span className={`font-bold text-[11px] ${aforoAgotado ? 'text-rose-400' : 'text-emerald-400'}`}>
                {aforoAgotado ? 'Agotado' : `${maximo - ocupados} sillas libres`}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  porcentajeAforo >= 90 ? 'bg-rose-500' : porcentajeAforo >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${porcentajeAforo}%` }}
              />
            </div>
          </div>

          {/* Renderizado Condicional del Botón según Estado */}
          {miBoleta ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              {miBoleta.estado === 'pendiente' ? (
                <>
                  <Clock3 className="text-amber-400 shrink-0" size={20} />
                  <div className="text-xs">
                    <p className="font-bold text-amber-400">Reserva Registrada (Pendiente)</p>
                    <p className="text-slate-400">Comprobante enviado. El administrador la confirmará pronto.</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-400">¡Reserva Confirmada!</p>
                    <p className="text-slate-400">Tienes tu silla asegurada para esta función.</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => onReservarClick(funcion)}
              disabled={aforoAgotado}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 ${
                aforoAgotado 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
              }`}
            >
              <Ticket size={18} />
              <span>
                {!user 
                  ? 'Ingresa para reservar' 
                  : aforoAgotado 
                    ? 'Aforo Completo' 
                    : 'Reservar Mi Silla'}
              </span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
