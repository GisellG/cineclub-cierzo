import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Plus, 
  Edit, 
  Trash2, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Users, 
  Image as ImageIcon, 
  X, 
  AlertCircle,
  Sparkles,
  Loader2,
  Tag,
  Ticket as TicketIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  Armchair
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { MovieScreening, CreateMovieInput, Cicle, Profile, Ticket } from '../types';
import { moviesService } from '../services/moviesService';
import { ticketsService } from '../services/ticketsService';
import { authService } from '../services/authService';

interface AdminDashboardProps {
  user: User | null;
  profile: Profile | null;
  onClose?: () => void;
}

const parseTicketSeats = (seatsData: unknown): string[] => {
  if (!seatsData) return [];
  if (Array.isArray(seatsData)) {
    return seatsData.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof seatsData === 'string') {
    let str = seatsData.trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      str = str.slice(1, -1);
    }
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      }
    } catch {
      // not JSON
    }
    return str
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, '').toUpperCase())
      .filter(Boolean);
  }
  return [];
};

type AdminTab = 'movies' | 'tickets';
type TicketFilter = 'pending' | 'confirmed' | 'rejected' | 'all';

export default function AdminDashboard({ user, profile, onClose }: AdminDashboardProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('movies');

  // Movies state
  const [movies, setMovies] = useState<MovieScreening[]>([]);
  const [cicles, setCicles] = useState<Cicle[]>([]);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(true);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('pending');
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [previewVoucherUrl, setPreviewVoucherUrl] = useState<string | null>(null);

  // Status messages
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Movie form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingMovie, setEditingMovie] = useState<MovieScreening | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>('');
  const [minsDuration, setMinsDuration] = useState<number>(120);
  const [maxCapacity, setMaxCapacity] = useState<number>(12);
  const [posterUrl, setPosterUrl] = useState<string>('');
  const [cicleId, setCicleId] = useState<string>('');
  const [posterFile, setPosterFile] = useState<File | null>(null);

  useEffect(() => {
    verifyAdminAccess();
  }, [user, profile]);

  const verifyAdminAccess = async () => {
    setCheckingAuth(true);
    if (!user) {
      setIsAdmin(false);
      setCheckingAuth(false);
      return;
    }

    const role = profile?.role || profile?.rol;
    if (role === 'admin') {
      setIsAdmin(true);
      fetchDashboardData();
    } else {
      const isUserAdmin = await authService.isAdmin(user.id);
      setIsAdmin(isUserAdmin);
      if (isUserAdmin) {
        fetchDashboardData();
      }
    }
    setCheckingAuth(false);
  };

  const fetchDashboardData = async () => {
    fetchMoviesData();
    fetchTicketsData();
  };

  const fetchMoviesData = async () => {
    setLoadingMovies(true);
    try {
      const [movieList, cicleList] = await Promise.all([
        moviesService.getMovies(),
        moviesService.getCicles()
      ]);
      setMovies(movieList);
      setCicles(cicleList);
    } catch (err: unknown) {
      console.error('Error al cargar películas:', err);
      setErrorMsg('No se pudieron cargar las películas de la base de datos.');
    } finally {
      setLoadingMovies(false);
    }
  };

  const fetchTicketsData = async () => {
    setLoadingTickets(true);
    try {
      const pendingList = await ticketsService.getPendingTickets();
      setTickets(pendingList);
    } catch (err: unknown) {
      console.error('Error al cargar boletas:', err);
      setErrorMsg('No se pudieron cargar las boletas pendientes.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'confirmed' | 'rejected') => {
    setUpdatingTicketId(ticketId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await ticketsService.updateTicketStatus(ticketId, newStatus);
      const actionText = newStatus === 'confirmed' ? 'aprobada' : 'rechazada';
      setSuccessMsg(`La boleta ha sido ${actionText} exitosamente.`);
      await fetchTicketsData();
      await fetchMoviesData();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al actualizar estado de boleta:', error);
      setErrorMsg(error.message || 'No se pudo actualizar el estado de la boleta.');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDateTime('');
    setMinsDuration(120);
    setMaxCapacity(12);
    setPosterUrl('');
    setCicleId('');
    setPosterFile(null);
    setEditingMovie(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (movie: MovieScreening) => {
    setEditingMovie(movie);
    setTitle(movie.title || '');
    setDescription(movie.description || '');
    
    if (movie.date_time) {
      const d = new Date(movie.date_time);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(isoLocal);
    } else {
      setDateTime('');
    }

    setMinsDuration(movie.mins_duration || 120);
    setMaxCapacity(movie.max_capacity || 12);
    setPosterUrl(movie.poster_url || '');
    setCicleId(movie.cicle_id || (movie.cicles?.id as string) || '');
    setPosterFile(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateTime || !minsDuration || !maxCapacity) {
      setErrorMsg('Por favor completa todos los campos requeridos (Título, Fecha/Hora, Duración y Capacidad).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const inputData: CreateMovieInput = {
      title,
      description,
      date_time: new Date(dateTime).toISOString(),
      mins_duration: Number(minsDuration),
      max_capacity: Number(maxCapacity),
      poster_url: posterUrl,
      cicle_id: cicleId || null
    };

    try {
      if (editingMovie) {
        await moviesService.updateMovie(editingMovie.id, inputData, posterFile || undefined);
        setSuccessMsg(`La película "${title}" fue actualizada correctamente.`);
      } else {
        await moviesService.createMovie(inputData, posterFile || undefined);
        setSuccessMsg(`La película "${title}" fue agregada exitosamente a la base de datos.`);
      }
      resetForm();
      fetchMoviesData();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al guardar película:', error);
      setErrorMsg(error.message || 'Ocurrió un error al guardar la película.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMovie = async (movie: MovieScreening) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la película "${movie.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    try {
      await moviesService.deleteMovie(movie.id);
      setSuccessMsg(`Película "${movie.title}" eliminada de la base de datos.`);
      fetchMoviesData();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al eliminar película:', error);
      setErrorMsg(error.message || 'No se pudo eliminar la película.');
    }
  };

  // Pending ticket counts
  const pendingTicketsCount = tickets.filter(t => t.status === 'pending').length;

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === 'all') return true;
    return t.status === ticketFilter;
  });

  // 1. Loading state when verifying access
  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-400">
        <Loader2 className="animate-spin text-rose-500" size={32} />
        <p className="text-sm font-medium">Verificando permisos de administración...</p>
      </div>
    );
  }

  // 2. Denied access state for non-admin users
  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-8 max-w-xl mx-auto my-8 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-red-950/60 border border-red-800/80 rounded-full flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white">Acceso Restringido</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Este dashboard de administración es exclusivo para usuarios con rol de <strong className="text-rose-400">administrador</strong>.
        </p>
        <p className="text-xs text-slate-500">
          Si consideras que deberías tener acceso, ponte en contacto con el administrador principal del Cineclub.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Volver a la cartelera
          </button>
        )}
      </div>
    );
  }

  // 3. Admin view
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Film className="text-rose-500" size={22} />
            <h1 className="text-xl font-bold text-white">Dashboard de Administración</h1>
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full">
              Rol Admin
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Gestiona las películas en la cartelera y aprueba las reservas de boletas de los usuarios.
          </p>
        </div>

        {activeTab === 'movies' && (
          <button
            onClick={openCreateForm}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-lg shadow-rose-950/40 cursor-pointer"
          >
            <Plus size={16} />
            <span>Agregar Película</span>
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('movies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'movies'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Film size={16} />
          <span>Gestión de Películas ({movies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 cursor-pointer relative ${
            activeTab === 'tickets'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <TicketIcon size={16} />
          <span>Boletas por Aprobar</span>
          {pendingTicketsCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {pendingTicketsCount}
            </span>
          )}
        </button>
      </div>

      {/* Error & Success Messages */}
      {errorMsg && (
        <div className="bg-red-950/50 border border-red-800/80 rounded-xl p-4 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/50 border border-emerald-800/80 rounded-xl p-4 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: MOVIES MANAGEMENT */}
      {activeTab === 'movies' && (
        <div className="space-y-6">
          {/* Form Modal / Panel */}
          {isFormOpen && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Film className="text-rose-500" size={18} />
                  <span>{editingMovie ? 'Editar Película' : 'Subir Nueva Película a la DB'}</span>
                </h2>
                <button
                  onClick={resetForm}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-300 font-medium block">
                      Título de la película <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: El Padrino"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-300 font-medium block">Sinopsis / Descripción</label>
                    <textarea
                      rows={3}
                      placeholder="Resumen o reseña de la función..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">
                      Fecha y Hora de Proyección <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">
                      Duración (Minutos) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={minsDuration}
                      onChange={(e) => setMinsDuration(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">
                      Aforo / Capacidad Máxima <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Cicle */}
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">Ciclo de Cine (Opcional)</label>
                    <select
                      value={cicleId}
                      onChange={(e) => setCicleId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">-- Sin ciclo asignado --</option>
                      {cicles.map((c) => (
                        <option key={c.id} value={c.id as string}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Poster file or URL */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-slate-300 font-medium block">Imagen del Poster / Afiche</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Opción A: Subir imagen local</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setPosterFile(e.target.files[0]);
                            }
                          }}
                          className="w-full text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Opción B: URL externa de imagen</span>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={posterUrl}
                          onChange={(e) => setPosterUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>{editingMovie ? 'Guardar Cambios' : 'Crear Película'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Movies Table / List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Películas registradas ({movies.length})
              </h2>
            </div>

            {loadingMovies ? (
              <div className="flex items-center justify-center p-12 text-slate-400 space-x-2">
                <Loader2 className="animate-spin text-rose-500" size={20} />
                <span className="text-xs font-medium">Cargando películas desde Supabase...</span>
              </div>
            ) : movies.length === 0 ? (
              <div className="text-center p-12 space-y-3">
                <Film className="mx-auto text-slate-600" size={40} />
                <p className="text-sm text-slate-400">No hay películas registradas en la base de datos.</p>
                <button
                  onClick={openCreateForm}
                  className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2 rounded-xl transition"
                >
                  Agregar la primera película
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {movies.map((m) => {
                  const date = new Date(m.date_time);
                  const validTickets = m.tickets ? m.tickets.filter((t) => t.status !== 'rejected') : [];
                  const takenSeatsSet = new Set<string>();
                  let unassignedCount = 0;

                  validTickets.forEach((t) => {
                    const seats = parseTicketSeats(t.seats);
                    if (seats.length > 0) {
                      seats.forEach((s) => takenSeatsSet.add(s));
                    } else {
                      unassignedCount += 1;
                    }
                  });

                  const bookedSeatsCount = takenSeatsSet.size + unassignedCount;

                  return (
                    <div key={m.id} className="p-4 sm:p-5 hover:bg-slate-800/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        {/* Poster thumbnail */}
                        <div className="w-16 h-24 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 flex items-center justify-center">
                          {m.poster_url ? (
                            <img
                              src={m.poster_url}
                              alt={m.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon className="text-slate-600" size={24} />
                          )}
                        </div>

                        {/* Movie Info */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-white text-base">{m.title}</h3>
                            {m.cicles?.title && (
                              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1">
                                <Tag size={10} className="text-rose-400" />
                                <span>{m.cicles.title}</span>
                              </span>
                            )}
                          </div>

                          {m.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-xl">
                              {m.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span className="flex items-center space-x-1 text-rose-400">
                              <Calendar size={12} />
                              <span>
                                {date.toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </span>

                            <span className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>
                                {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} ({m.mins_duration}m)
                              </span>
                            </span>

                            <span className="flex items-center space-x-1">
                              <Users size={12} />
                              <span>
                                Sillas ocupadas: {bookedSeatsCount}/{m.max_capacity}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => openEditForm(m)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition text-xs flex items-center space-x-1"
                          title="Editar película"
                        >
                          <Edit size={14} />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMovie(m)}
                          className="p-2 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded-xl transition text-xs flex items-center space-x-1"
                          title="Eliminar película"
                        >
                          <Trash2 size={14} />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING TICKETS APPROVAL */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Ticket Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-medium">Filtrar boletas:</span>
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTicketFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    ticketFilter === 'pending'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pendientes ({tickets.filter(t => t.status === 'pending').length})
                </button>
                <button
                  onClick={() => setTicketFilter('confirmed')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    ticketFilter === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Confirmadas ({tickets.filter(t => t.status === 'confirmed').length})
                </button>
                <button
                  onClick={() => setTicketFilter('rejected')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    ticketFilter === 'rejected'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rechazadas ({tickets.filter(t => t.status === 'rejected').length})
                </button>
                <button
                  onClick={() => setTicketFilter('all')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    ticketFilter === 'all'
                      ? 'bg-slate-800 text-slate-100 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas ({tickets.length})
                </button>
              </div>
            </div>

            <button
              onClick={fetchTicketsData}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 bg-slate-800 rounded-xl transition"
            >
              Actualizar lista
            </button>
          </div>

          {/* Tickets List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingTickets ? (
              <div className="flex items-center justify-center p-12 text-slate-400 space-x-2">
                <Loader2 className="animate-spin text-rose-500" size={20} />
                <span className="text-xs font-medium">Cargando boletas desde Supabase...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center p-12 space-y-2">
                <TicketIcon className="mx-auto text-slate-600" size={40} />
                <p className="text-sm text-slate-400">
                  No hay boletas con estado &quot;{ticketFilter}&quot;.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredTickets.map((t) => {
                  const createdDate = t.created_at ? new Date(t.created_at) : null;
                  const movie = t.movie_screening;
                  const userProfile = t.profiles;
                  const isPending = t.status === 'pending';
                  const isConfirmed = t.status === 'confirmed';
                  const isRejected = t.status === 'rejected';

                  const ticketSeats = parseTicketSeats(t.seats);
                  const seatsCount = ticketSeats.length > 0 ? ticketSeats.length : 1;

                  return (
                    <div key={t.id} className="p-5 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-white text-base">
                            {movie?.title || 'Película desconocida'}
                          </h3>

                          {/* Status Badge */}
                          {isPending && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                              Aprobada
                            </span>
                          )}
                          {isRejected && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                              Rechazada
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300 space-y-1">
                          <p>
                            <span className="text-slate-400">Usuario:</span>{' '}
                            <strong className="text-slate-200">{userProfile?.email || t.user_id}</strong>
                            {userProfile?.role && (
                              <span className="ml-2 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                Rol: {userProfile.role}
                              </span>
                            )}
                          </p>

                          {/* Cantidad de Personas y Sillas Reservadas */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                            <span className="inline-flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200">
                              <Users size={13} className="text-rose-400" />
                              <span>{seatsCount} {seatsCount === 1 ? 'persona' : 'personas'}</span>
                            </span>

                            {ticketSeats.length > 0 ? (
                              <span className="inline-flex items-center space-x-1.5 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-300 font-mono">
                                <Armchair size={13} className="text-rose-400" />
                                <span>Sillas: {ticketSeats.join(', ')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[11px] text-slate-500 italic bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800/50">
                                (Sin sillas asignadas)
                              </span>
                            )}
                          </div>

                          {movie?.date_time && (
                            <p className="text-slate-400">
                              Proyección: {new Date(movie.date_time).toLocaleDateString('es-ES', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}

                          {createdDate && (
                            <p className="text-[11px] text-slate-500">
                              Solicitado el: {createdDate.toLocaleString('es-ES')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Voucher & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Voucher Receipt button / preview */}
                        {t.recipt_url ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setPreviewVoucherUrl(t.recipt_url || null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
                            >
                              <Eye size={14} className="text-rose-400" />
                              <span>Ver Comprobante</span>
                            </button>
                            <a
                              href={t.recipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-white"
                              title="Abrir imagen en nueva pestaña"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sin comprobante</span>
                        )}

                        {/* Approval / Rejection buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateTicketStatus(t.id, 'confirmed')}
                            disabled={updatingTicketId === t.id || isConfirmed}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer ${
                              isConfirmed
                                ? 'bg-emerald-950/60 text-emerald-400 opacity-60 border border-emerald-800/60'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            } disabled:opacity-50`}
                          >
                            {updatingTicketId === t.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            <span>{isConfirmed ? 'Aprobada' : 'Aprobar'}</span>
                          </button>

                          <button
                            onClick={() => handleUpdateTicketStatus(t.id, 'rejected')}
                            disabled={updatingTicketId === t.id || isRejected}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer ${
                              isRejected
                                ? 'bg-red-950/60 text-red-400 opacity-60 border border-red-800/60'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                            } disabled:opacity-50`}
                          >
                            {updatingTicketId === t.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <XCircle size={14} />
                            )}
                            <span>{isRejected ? 'Rechazada' : 'Rechazar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voucher Image Modal Preview */}
      {previewVoucherUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Eye className="text-rose-500" size={16} />
                <span>Comprobante de Transferencia</span>
              </h3>
              <button
                onClick={() => setPreviewVoucherUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/50">
              <img
                src={previewVoucherUrl}
                alt="Comprobante de transferencia"
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800"
              />
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <a
                href={previewVoucherUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:underline flex items-center space-x-1"
              >
                <ExternalLink size={12} />
                <span>Ver imagen completa en pestaña nueva</span>
              </a>
              <button
                onClick={() => setPreviewVoucherUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
