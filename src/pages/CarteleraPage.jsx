import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Ticket, 
  Upload, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { funcionesService } from '../services/funcionesService';
import { boletasService } from '../services/boletasService';
import { authService } from '../services/authService';
import AforoBar from '../components/AforoBar';
import BoletaCard from '../components/BoletaCard';

export default function CarteleraPage() {
  const [funcion, setFuncion] = useState(null);
  const [profile, setProfile] = useState(null);
  const [miBoleta, setMiBoleta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados del modal de reserva
  const [showModal, setShowModal] = useState(false);
  const [fileComprobante, setFileComprobante] = useState(null);
  const [solicitarMiembro, setSolicitarMiembro] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Obtener función activa
      const proximaFuncion = await funcionesService.getProximaFuncion();
      setFuncion(proximaFuncion);

      // 2. Obtener usuario actual y ver si ya tiene reserva
      const perf = await authService.getCurrentProfile();
      setProfile(perf);

      if (perf && proximaFuncion) {
        const boletaExistente = await boletasService.getMiBoletaActiva(
          proximaFuncion.id, 
          perf.id
        );
        setMiBoleta(boletaExistente);
      }
    } catch (err) {
      console.error('Error al cargar la cartelera:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileComprobante(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const handleReservar = async (e) => {
    e.preventDefault();
    if (!fileComprobante) {
      setErrorMsg('Por favor adjunta la captura del comprobante de transferencia.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const nuevaBoleta = await boletasService.reservarBoleta({
        funcionId: funcion.id,
        userId: profile.id,
        fileComprobante: fileComprobante,
        solicitarSerMiembro: solicitarMiembro
      });

      setMiBoleta(nuevaBoleta);
      setShowModal(false);
      // Recargar para actualizar la barra de aforo
      cargarDatos();
    } catch (err) {
      console.error('Error al reservar:', err);
      setErrorMsg('No se pudo procesar la reserva. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Cargando la función de la semana...</p>
      </div>
    );
  }

  if (!funcion) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4">
        <Film size={48} className="mx-auto text-slate-600" />
        <h2 className="text-2xl font-bold text-slate-200">No hay funciones programadas</h2>
        <p className="text-slate-400 text-sm">
          El administrador está preparando el próximo ciclo. ¡Vuelve a consultar pronto o participa proponiendo una película!
        </p>
      </div>
    );
  }

  const boletasOcupadas = funcion.boletas?.filter(b => b.estado !== 'rechazada').length || 0;
  const aforoAgotado = boletasOcupadas >= funcion.cupo_maximo;
  const fechaObjeto = new Date(funcion.fecha_hora);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Banner Principal de la Película */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl grid md:grid-cols-5 gap-0">
        
        {/* Afiche / Póster */}
        <div className="md:col-span-2 relative min-h-[300px] bg-slate-950 flex items-center justify-center">
          {funcion.poster_url ? (
            <img 
              src={funcion.poster_url} 
              alt={funcion.titulo} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-slate-600 space-y-2">
              <Film size={64} className="mx-auto opacity-50" />
              <p className="text-xs uppercase tracking-widest font-semibold">Cineclub Vecinal</p>
            </div>
          )}
          {funcion.ciclos?.titulo && (
            <span className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles size={14} />
              {funcion.ciclos.titulo}
            </span>
          )}
        </div>

        {/* Detalles de la Función */}
        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">Próxima Proyección</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{funcion.titulo}</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{funcion.descripcion || 'Sin descripción disponible.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-800 text-slate-300 text-xs">
            <div className="flex items-center space-x-2">
              <Calendar size={18} className="text-rose-500" />
              <div>
                <p className="text-slate-500 font-medium">Fecha</p>
                <p className="font-semibold text-slate-200">
                  {fechaObjeto.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={18} className="text-rose-500" />
              <div>
                <p className="text-slate-500 font-medium">Hora / Duración</p>
                <p className="font-semibold text-slate-200">
                  {fechaObjeto.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({funcion.duracion_minutos} min)
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Aforo Dinámico */}
          <AforoBar reservados={boletasOcupadas} maximo={funcion.cupo_maximo} />

          {/* Estado de Reserva o Botón de Acción */}
          {miBoleta ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-emerald-400">
                <CheckCircle2 size={24} />
                <div>
                  <p className="text-sm font-bold">¡Reserva registrada!</p>
                  <p className="text-xs text-slate-300">Estado: <span className="capitalize font-semibold text-emerald-400">{miBoleta.estado}</span></p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={aforoAgotado}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center space-x-2 transition ${
                aforoAgotado 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              <Ticket size={20} />
              <span>{aforoAgotado ? 'Aforo Completo' : 'Reservar Mi Asiento'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Si el vecino ya reservó, renderizar su Boleta Interactiva con QR */}
      {miBoleta && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center space-y-6">
          <h2 className="text-xl font-bold text-white">Tu Boleta de Entrada</h2>
          <BoletaCard 
            boleta={miBoleta} 
            tituloPelicula={funcion.titulo} 
            nombreVecino={profile?.nombre} 
            apartamento={profile?.apartamento} 
          />
        </div>
      )}

      {/* MODAL DE RESERVA Y APORTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative space-y-6">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div>
              <h3 className="text-2xl font-bold text-white">Confirmar Reserva</h3>
              <p className="text-xs text-slate-400 mt-1">Sube la captura de la transferencia para apartar tu silla.</p>
            </div>

            <form onSubmit={handleReservar} className="space-y-5">
              {/* Carga de Imagen */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Comprobante de Transferencia (Nequi / Bre-B)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-2xl p-6 text-center bg-slate-950/50 cursor-pointer transition">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden" 
                    id="comprobante-input" 
                  />
                  <label htmlFor="comprobante-input" className="cursor-pointer space-y-2 block">
                    <Upload size={32} className="mx-auto text-rose-500" />
                    <p className="text-sm text-slate-300 font-medium">
                      {fileComprobante ? fileComprobante.name : 'Haz clic para adjuntar o tomar foto'}
                    </p>
                    <p className="text-[11px] text-slate-500">Formatos permitidos: JPG, PNG, WEBP</p>
                  </label>
                </div>
              </div>

              {/* Casilla Opción Miembro */}
              {profile?.rol === 'casual' && (
                <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id="chk-miembro"
                    checked={solicitarMiembro}
                    onChange={(e) => setSolicitarMiembro(e.target.checked)}
                    className="mt-1 rounded accent-rose-600 w-4 h-4"
                  />
                  <label htmlFor="chk-miembro" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                    <strong className="text-amber-400 flex items-center gap-1 mb-0.5">
                      <UserCheck size={14} /> Registrarme como Miembro Frecuente
                    </strong>
                    Me permitirá votar en las encuestas de selección de películas para las próximas funciones.
                  </label>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center space-x-2 text-rose-400 bg-rose-950/50 p-3 rounded-xl border border-rose-800/40 text-xs">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center space-x-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Subiendo comprobante...</span>
                  ) : (
                    <span>Enviar y Reservar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
