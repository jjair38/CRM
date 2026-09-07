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

  const handleAuthenticate = React.useCallback(async () => {
    setStatus('authenticating');
    setErrorMessage('');

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Biometria não suportada neste navegador.');
      }

      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('Autenticação biométrica não disponível no dispositivo.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: any = {
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: [] 
        }
      };

      await navigator.credentials.get(options);
      
      setStatus('success');
      setTimeout(() => {
        onUnlock();
      }, 800);
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Falha ao verificar identidade.');
    }
  }, [onUnlock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 100);
    return () => clearTimeout(timer);
  }, [handleAuthenticate]);

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
            Aplicativo <span className="text-gold font-bold">Bloqueado</span>
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] leading-relaxed">
            {status === 'success' ? 'Identidade confirmada' : 'Use o Face ID, Digital ou Código do seu celular'}
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
        <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-700 font-black">Segurança do Dispositivo</p>
      </div>
    </div>
  );
}
