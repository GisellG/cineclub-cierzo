import React, { useState, useEffect } from 'react';
import { Upload, X, AlertCircle, UserCheck, Armchair, Check } from 'lucide-react';
import { ticketsService } from '../services/ticketsService';
import { MovieScreening, Ticket } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  movie: MovieScreening | null;
  userId?: string;
  onClose: () => void;
  onSuccessBooking: (ticket: Ticket) => void;
}

const ROW_A = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
const ROW_B = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

export default function BookingModal({ isOpen, movie, userId, onClose, onSuccessBooking }: BookingModalProps) {
  const [seatCount, setSeatCount] = useState<number>(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [getMember, setGetMember] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setGetMember(false);
      setSeatCount(1);
      setSelectedSeats([]);
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !movie) return null;

  // Calculate occupied seats from existing movie bookings
  const existingTickets = movie.tickets || movie.ticket || [];
  const occupiedSeats = new Set<string>();
  existingTickets.forEach((t) => {
    if (t.status !== 'rejected' && t.seats) {
      if (Array.isArray(t.seats)) {
        t.seats.forEach((s) => occupiedSeats.add(String(s).trim().toUpperCase()));
      } else if (typeof t.seats === 'string') {
        let str = t.seats.trim();
        if (str.startsWith('{') && str.endsWith('}')) {
          str = str.slice(1, -1);
        }
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: string) => occupiedSeats.add(String(s).trim().toUpperCase()));
            return;
          }
        } catch {
          // fallback to comma separated
        }
        str.split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean).forEach((s) => occupiedSeats.add(s.toUpperCase()));
      }
    }
  });

  const handleSeatCountChange = (count: number) => {
    setSeatCount(count);
    setErrorMsg('');
    // Adjust selected seats if current count exceeds new limit
    if (selectedSeats.length > count) {
      setSelectedSeats(selectedSeats.slice(0, count));
    }
  };

  const toggleSeat = (seatId: string) => {
    if (occupiedSeats.has(seatId.toUpperCase())) return;
    setErrorMsg('');

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length < seatCount) {
        setSelectedSeats([...selectedSeats, seatId]);
      } else {
        // Replace oldest selection or keep to capacity
        if (seatCount === 1) {
          setSelectedSeats([seatId]);
        } else {
          setSelectedSeats([...selectedSeats.slice(1), seatId]);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedSeats.length === 0) {
      setErrorMsg('Selecciona al menos una silla en la sala.');
      return;
    }

    if (selectedSeats.length !== seatCount) {
      setErrorMsg(`Por favor selecciona ${seatCount} silla(s) en el mapa de la sala.`);
      return;
    }

    if (!file) {
      setErrorMsg('Adjunta la captura del comprobante de transferencia.');
      return;
    }

    if (!userId) {
      setErrorMsg('Usuario no autenticado.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const newTicket = await ticketsService.bookingTicket({
        movieId: movie.id,
        userId,
        fileVoucher: file,
        getMember,
        seats: selectedSeats
      });

      onSuccessBooking(newTicket);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      setErrorMsg(error.message || 'Error al procesar la reserva. Verifica la imagen e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md relative space-y-5 my-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div>
          <h3 className="text-xl font-bold text-white">Reservar Sillas</h3>
          <p className="text-xs text-slate-400 mt-1">Función: <strong className="text-slate-200">{movie.title}</strong></p>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-rose-300 bg-rose-950/50 p-3 rounded-xl border border-rose-800/40 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Cantidad de sillas */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Armchair size={15} className="text-rose-500" />
                <span>1. Cantidad de sillas</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {seatCount} {seatCount === 1 ? 'silla' : 'sillas'}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSeatCountChange(num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    seatCount === num
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Selección de sillas en el mapa */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                2. Selecciona tus sillas en la sala
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedSeats.length} / {seatCount} seleccionadas
              </span>
            </div>

            {/* Layout de Pantalla */}
            <div className="w-full bg-gradient-to-b from-rose-500/20 to-transparent border-t-2 border-rose-500/80 rounded-t-full py-1 text-center text-[9px] uppercase font-bold tracking-[0.25em] text-rose-300/80 shadow-[0_-6px_12px_rgba(244,63,94,0.15)]">
              P A N T A L L A
            </div>

            {/* Sillas: Fila A y Fila B */}
            <div className="space-y-2.5 pt-1">
              {/* Fila A */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-500 w-4 text-center">A</span>
                <div className="grid grid-cols-6 gap-2 flex-1">
                  {ROW_A.map((seatId) => {
                    const isOccupied = occupiedSeats.has(seatId.toUpperCase());
                    const isSelected = selectedSeats.includes(seatId);
                    return (
                      <button
                        key={seatId}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => toggleSeat(seatId)}
                        className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                          isOccupied
                            ? 'bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-rose-600 text-white border border-rose-400 shadow-md shadow-rose-900/50 font-bold scale-105'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check size={14} className="stroke-[3]" /> : seatId}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fila B */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-500 w-4 text-center">B</span>
                <div className="grid grid-cols-6 gap-2 flex-1">
                  {ROW_B.map((seatId) => {
                    const isOccupied = occupiedSeats.has(seatId.toUpperCase());
                    const isSelected = selectedSeats.includes(seatId);
                    return (
                      <button
                        key={seatId}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => toggleSeat(seatId)}
                        className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                          isOccupied
                            ? 'bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-rose-600 text-white border border-rose-400 shadow-md shadow-rose-900/50 font-bold scale-105'
                            : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? <Check size={14} className="stroke-[3]" /> : seatId}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Leyenda de sillas */}
            <div className="flex items-center justify-center space-x-4 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800"></span>
                <span>Disponible</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-rose-600 border border-rose-400"></span>
                <span className="text-slate-200 font-medium">Seleccionada</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800 text-slate-600 text-[8px] text-center leading-3">✕</span>
                <span>Ocupada</span>
              </div>
            </div>

            {/* Sillas elegidas */}
            {selectedSeats.length > 0 && (
              <div className="text-xs text-center text-slate-300 pt-1">
                Sillas reservadas: <strong className="text-amber-400 font-bold">{selectedSeats.sort().join(', ')}</strong>
              </div>
            )}
          </div>

          {/* File Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Comprobante de Transferencia (Nequi / Bre-B)
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-rose-500/50 rounded-xl p-4 text-center bg-slate-950/50 cursor-pointer transition">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="hidden" 
                id="receipt-file" 
              />
              <label htmlFor="receipt-file" className="cursor-pointer block space-y-1">
                <Upload size={22} className="mx-auto text-rose-500" />
                <p className="text-xs text-slate-300 font-medium">
                  {file ? file.name : 'Haz clic para adjuntar comprobante'}
                </p>
              </label>
            </div>
          </div>

          {/* Opcion Miembro */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-start space-x-3">
            <input 
              type="checkbox" 
              id="chk-miembro"
              checked={getMember}
              onChange={(e) => setGetMember(e.target.checked)}
              className="mt-0.5 rounded accent-rose-600 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="chk-miembro" className="text-xs text-slate-300 cursor-pointer leading-tight">
              <strong className="text-amber-400 flex items-center gap-1 mb-0.5">
                <UserCheck size={13} /> Quiero ser Miembro Frecuente
              </strong>
              Podrás proponer películas y votar en las encuestas de selección.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Subiendo comprobante...' : 'Enviar Reserva'}
          </button>
        </form>
      </div>
    </div>
  );
}
