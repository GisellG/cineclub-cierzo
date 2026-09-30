import React, { useState } from 'react';
import { Upload, X, AlertCircle, UserCheck } from 'lucide-react';
import { ticketsService } from '../services/ticketsService';

export default function ReservaModal({ isOpen, funcion, userId, onClose, onReservaExitosa }) {
  const [file, setFile] = useState(null);
  const [solicitarMiembro, setSolicitarMiembro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !funcion) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Adjunta la captura del comprobante.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const nuevaBoleta = await ticketsService.reservarBoleta({
        funcionId: funcion.id,
        userId,
        fileComprobante: file,
        solicitarMiembro
      });

      onReservaExitosa(nuevaBoleta);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al procesar la reserva. Verifica la imagen e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md relative space-y-5">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div>
          <h3 className="text-xl font-bold text-white">Reservar Silla</h3>
          <p className="text-xs text-slate-400 mt-1">Función: <strong className="text-slate-200">{funcion.titulo}</strong></p>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-rose-300 bg-rose-950/50 p-3 rounded-xl border border-rose-800/40 text-xs">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Comprobante de Transferencia (Nequi / Bre-B)
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-rose-500/50 rounded-xl p-4 text-center bg-slate-950/50 cursor-pointer transition">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden" 
                id="receipt-file" 
              />
              <label htmlFor="receipt-file" className="cursor-pointer block space-y-1">
                <Upload size={24} className="mx-auto text-rose-500" />
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
              checked={solicitarMiembro}
              onChange={(e) => setSolicitarMiembro(e.target.checked)}
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
