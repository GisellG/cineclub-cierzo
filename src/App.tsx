import React, { useState, useEffect } from 'react';
import { Film, LogOut, ShieldCheck, Ticket } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import LoginModal from './components/LoginModal';
import ScreeningModal from './components/ScreeningModal';
import BookingModal from './components/BookingModal';
import AdminDashboard from './components/AdminDashboard';
import { MovieScreening, Profile } from './types';
import { authService } from './services/authService';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'cartelera' | 'admin'>('cartelera');

  // State for the booking
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [movieSelected, setMovieSelected] = useState<MovieScreening | null>(null);
  const [screeningRefreshKey, setScreeningRefreshKey] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setCurrentView('cartelera');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const prof = await authService.getProfile(userId);
    setProfile(prof);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentView('cartelera');
  };

  const handleBookingClick = (movie: MovieScreening) => {
    if (!session) {
      setIsLoginOpen(true);
    } else {
      setMovieSelected(movie);
      setIsBookingOpen(true);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.rol === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div 
            onClick={() => setCurrentView('cartelera')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <Film className="text-rose-500" size={24} />
            <span className="font-bold text-lg tracking-tight">Cineclub Cierzo</span>
          </div>

          {/* Navigation view switch */}
          {session && (
            <nav className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setCurrentView('cartelera')}
                className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center space-x-1.5 cursor-pointer ${
                  currentView === 'cartelera'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ticket size={14} />
                <span>Cartelera</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center space-x-1.5 cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>Panel Admin</span>
                </button>
              )}
            </nav>
          )}
        </div>

        <div>
          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-slate-300 flex items-center space-x-1.5">
                <span>{session.user.email}</span>
                {isAdmin && (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md">
                    Admin
                  </span>
                )}
              </span>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="text-xs bg-rose-600 hover:bg-rose-500 font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
            >
              Ingresar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        {currentView === 'admin' ? (
          <AdminDashboard 
            user={session?.user || null} 
            profile={profile}
            onClose={() => setCurrentView('cartelera')} 
          />
        ) : (
          <>
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <h1 className="text-2xl font-extrabold text-white">Cartelera de la Semana</h1>
              <p className="text-sm text-slate-400">Reserva tu silla y participa en el cineclub.</p>
            </section>

            <ScreeningModal 
              user={session?.user} 
              onBookingClick={handleBookingClick} 
              refreshTrigger={screeningRefreshKey}
            />
          </>
        )}
      </main>

      {/* Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      
      <BookingModal 
        isOpen={isBookingOpen} 
        movie={movieSelected}
        userId={session?.user?.id}
        onClose={() => setIsBookingOpen(false)}
        onSuccessBooking={() => {
          setScreeningRefreshKey((prev) => prev + 1);
          alert('¡Reserva enviada exitosamente! Tu boleta está en estado pendiente de aprobación.');
        }}
      />

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        Cineclub Cierzo • Aforo 12-24 personas
      </footer>
    </div>
  );
}
