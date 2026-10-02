import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Ticket as TicketIcon, Sparkles, CheckCircle2, Clock3, Film } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { MovieScreening, Ticket } from '../types';

interface ScreeningModalProps {
  user?: User | null;
  onBookingClick: (movie: MovieScreening) => void;
}

export default function ScreeningModal({ user, onBookingClick }: ScreeningModalProps) {
  const [movie, setMovie] = useState<MovieScreening | null>(null);
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadMovieAndBooking();
  }, [user]);

  const loadMovieAndBooking = async () => {
    setLoading(true);
    try {
      // 1. Read the next movie
      const { data: movieData, error } = await supabase
        .from('movie_screening')
        .select(`
          *,
          cicles ( title ),
          tickets ( id, user_id, status )
        `)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const currentMovie = movieData as MovieScreening | null;
      setMovie(currentMovie);

      // 2. If there's a logged user, verify if already has a registered booking 
      if (user && currentMovie) {
        const ticketList = currentMovie.tickets || currentMovie.ticket || [];
        const ticketUser = ticketList.find(b => b.user_id === user.id && b.status !== 'rejected');
        setMyTicket(ticketUser || null);
      } else {
        setMyTicket(null);
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

  if (!movie) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 space-y-2">
        <Film className="mx-auto text-slate-600 opacity-50" size={48} />
        <h3 className="text-lg font-bold text-slate-300">No hay funciones programadas</h3>
        <p className="text-xs text-slate-500">Pronto el administrador publicará la película del próximo ciclo.</p>
      </div>
    );
  }

  // Cálculos de aforo
  const ticketList = movie.tickets || movie.ticket || [];
  const validTickets = ticketList.filter(b => b.status !== 'rejected');
  const taken = validTickets.length;
  const max = movie.max_capacity;
  const percentCapacity = Math.min(100, Math.round((taken / max) * 100));
  const soldOut = taken >= max;
  const date = new Date(movie.date_time);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="grid md:grid-cols-5 gap-0">
        
        {/* Columna Izquierda: Poster / Ilustración */}
        <div className="md:col-span-2 bg-slate-950 min-h-[220px] flex items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800">
          {movie.poster_url ? (
            <img 
              src={movie.poster_url} 
              alt={movie.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Film size={56} className="mx-auto text-slate-700" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cineclub Vecinal</p>
            </div>
          )}

          {movie.cicles?.title && (
            <span className="absolute top-3 left-3 bg-slate-950/90 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur flex items-center gap-1.5">
              <Sparkles size={13} />
              {movie.cicles.title}
            </span>
          )}
        </div>

        {/* Columna Derecha: Información y Acción */}
        <div className="md:col-span-3 p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Próxima Función</span>
            <h2 className="text-2xl font-extrabold text-white">{movie.title}</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{movie.description}</p>
          </div>

          {/* Ficha técnica rápida */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Calendar size={15} className="text-rose-500" />
              <span>{date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={15} className="text-rose-500" />
              <span>{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({movie.mins_duration}m)</span>
            </div>
          </div>

          {/* Barra de Aforo Dinámica */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">{taken} de {max} sillas ocupadas</span>
              <span className={`font-bold text-[11px] ${soldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                {soldOut ? 'Agotado' : `${max - taken} sillas libres`}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  percentCapacity >= 90 ? 'bg-rose-500' : percentCapacity >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${percentCapacity}%` }}
              />
            </div>
          </div>

          {/* Renderizado Condicional del Botón según Estado */}
          {myTicket ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              {myTicket.status === 'pending' ? (
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
              onClick={() => onBookingClick(movie)}
              disabled={soldOut}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 ${
                soldOut 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
              }`}
            >
              <TicketIcon size={18} />
              <span>
                {!user 
                  ? 'Ingresa para reservar' 
                  : 'Reservar Mi Silla'}
              </span>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
