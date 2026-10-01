import React, { useState } from 'react';
import { Mail, KeyRound, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1); // Step 1: Wait for Email, Step 2: Ask for OTP code
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  // Step 1: Ask for OTP code via Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase.auth.signInWithOtp({ email });

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setStep(2);
      setMessage({ type: 'success', text: 'Código enviado a tu correo. Revisa tu bandeja de entrada.' });
    }
  };

  // Step 2: Verify the code sent by the user
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: 'Código incorrecto o vencido.' });
    } else {
      onClose(); // Close the modal if it's auth successfully.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">
          {step === 1 ? 'Ingresar al Cineclub' : 'Ingresa el código'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {step === 1 
            ? 'Te enviaremos un código temporal de acceso a tu correo.' 
            : `Enviamos un código de 6 dígitos a ${email}`}
        </p>

        {message.text && (
          <div className={`p-3 rounded-xl text-xs mb-4 ${
            message.type === 'error' ? 'bg-rose-950/50 border border-rose-800/50 text-rose-300' : 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-300'
          }`}>
            {message.text}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  placeholder="vecino@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{loading ? 'Enviando...' : 'Enviar código'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Código de 6 dígitos</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white text-center tracking-widest placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar e Ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
