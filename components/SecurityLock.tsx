'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Lock, ShieldCheck, ShieldAlert, Key } from 'lucide-react';

interface SecurityLockProps {
  onUnlock: () => void;
}

export function SecurityLock({ onUnlock }: SecurityLockProps) {
  const [status, setStatus] = useState<'idle' | 'authenticating' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuthenticate = async () => {
    setStatus('authenticating');
    setErrorMessage('');

    try {
      // Basic check for WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error('Biometria não suportada neste navegador.');
      }

      // Check if platform authenticator is available
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        // Fallback or error
        throw new Error('Autenticação biométrica não disponível no dispositivo.');
      }

      // Trigger the authentication
      // For a simple local lock, we can use a "get" request with a challenge
      // Note: In a real production app, this would involve server-side validation
      // But for a "local app lock", we are verifying the user is the device owner.
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: any = {
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          userVerification: 'required',
          // Note: We use a generic request to trigger the device's default auth (PIN/FaceID/Fingerprint)
          allowCredentials: [] 
        }
      };

      // Since we don't have a specific credential ID stored (it's a generic lock),
      // some browsers might behave differently. A better way for "local lock" is often
      // to just use the device's native lock if it's a PWA, but WebAuthn is the web standard.
      
      // Let's try a simpler approach for the local lock:
      // If we haven't "registered", we might need a dummy registration or just rely on the UI.
      // However, the most compatible way to trigger biometrics on mobile is a "get" with empty allowCredentials
      // or a specific credential if we had one.
      
      // If it fails, we can just use a simple state check.
      
      // MOCK implementation for the prompt experience if the API is too restrictive for local-only:
      // In many environments, WebAuthn requires a HTTPS domain and proper ceremony.
      
      await navigator.credentials.get(options);
      
      setStatus('success');
      setTimeout(() => {
        onUnlock();
      }, 800);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Falha ao verificar identidade.');
      
      // If it's a "NotAllowedError" (user cancelled), we don't want to alert, just stay in idle/error
    }
  };

  useEffect(() => {
    // Automatically trigger on mount if possible
    handleAuthenticate();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#080809] flex flex-col items-center justify-center p-6 text-center">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-gold/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-gold/5 rounded-full blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 space-y-12 max-w-sm w-full"
      >
        <div className="relative mx-auto w-24 h-24">
          <AnimatePresence mode="wait">
            {status === 'idle' || status === 'authenticating' ? (
              <motion.div
                key="lock"
                initial={{ opacity: 0, rotate: -20 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="w-full h-full bg-zinc-900 rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl"
              >
                <Lock className="text-zinc-500 w-10 h-10" />
              </motion.div>
            ) : status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full bg-gold rounded-3xl flex items-center justify-center shadow-2xl shadow-gold/20"
              >
                <ShieldCheck className="text-black w-10 h-10" />
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full bg-rose-soft/20 rounded-3xl border border-rose-soft/20 flex items-center justify-center"
              >
                <ShieldAlert className="text-rose-soft w-10 h-10" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {status === 'authenticating' && (
            <div className="absolute -inset-2 border-2 border-gold border-t-transparent rounded-[36px] animate-spin" />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-serif text-white tracking-widest uppercase">
            Acesso <span className="text-gold font-bold">Protegido</span>
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] leading-relaxed">
            {status === 'success' ? 'Identidade confirmada' : 'Aproxime sua biometria ou insira seu PIN para continuar'}
          </p>
        </div>

        <div className="pt-8">
          {status === 'error' ? (
            <div className="space-y-6">
              <p className="text-[10px] text-rose-soft font-bold uppercase tracking-widest">{errorMessage}</p>
              <button
                onClick={handleAuthenticate}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all uppercase text-[10px] tracking-[0.2em] font-bold"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <button
              onClick={handleAuthenticate}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gold rounded-full text-black text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-gold/10"
            >
              <Fingerprint size={18} />
              <span>Desbloquear</span>
            </button>
          )}
        </div>
      </motion.div>

      <div className="absolute bottom-12 text-center w-full">
        <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-700 font-black">Elite Security Layer</p>
      </div>
    </div>
  );
}
