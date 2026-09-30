import React, { useState, useEffect } from 'react';
import { Film, LogOut } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import LoginModal from './components/LoginModal';
import ScreeningModal from './components/ScreeningModal';

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Encabezado / Navbar Simple */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Film className="text-rose-500" size={24} />
          <span className="font-bold text-lg tracking-tight">Cineclub Vecinal</span>
        </div>

        <div>
          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-slate-300">
                {session.user.email}
              </span>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1 transition"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="text-xs bg-rose-600 hover:bg-rose-500 font-semibold px-4 py-2 rounded-xl transition"
            >
              Ingresar
            </button>
          )}
        </div>
      </header>

      {/* 2. Contenido Principal */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Cartelera de la Semana</h1>
          <p className="text-sm text-slate-400">
            Reserva tu silla y participa en las decisiones del cineclub.
          </p>
        </section>

        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          Próximamente: Componente de la película activa
        </div>
      </main>

      {/* Modal de Inicio de Sesión */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* 3. Pie de página */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600">
        Cineclub Vecinal • Aforo 12-24 personas
      </footer>
    </div>
  );
}
