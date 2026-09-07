'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-all shadow-lg shadow-gold/5"
      >
        <Download size={16} />
        Instalar Aplicativo
      </button>
    );
  }

  // Fallback / Guidance for non-natively installable browsers (except if already installed)
  return (
    <>
      <button
        onClick={() => setShowIOSGuide(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-all"
      >
        <Download size={16} />
        Como Instalar
      </button>

      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-[#111113] p-8 border border-white/5 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center border border-gold/20">
                  <Download className="text-gold w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-widest font-sans">Instalar o App</h3>
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                    Transforme este site em um aplicativo no seu dispositivo:
                  </p>
                </div>

                <div className="w-full space-y-4 py-4 text-left">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-widest text-gold font-bold border-b border-gold/10 pb-1">No iPhone / iPad (Safari)</p>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">1</div>
                      <p className="text-[11px] text-zinc-400">Toque em <strong>Compartilhar</strong> <Share size={12} className="inline mx-1 text-blue-400" /> na barra do navegador.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">2</div>
                      <p className="text-[11px] text-zinc-400">Selecione <strong>Adicionar à Tela de Início</strong>.</p>
                    </div>
                  </div>

                  <div className="space-y-4 mt-6">
                    <p className="text-[10px] uppercase tracking-widest text-gold font-bold border-b border-gold/10 pb-1">No Android / Chrome</p>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">1</div>
                      <p className="text-[11px] text-zinc-400">Toque nos <strong>três pontos</strong> <span className="inline-block w-1 h-3 bg-zinc-500 mx-1 rounded-full" /> no canto superior.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">2</div>
                      <p className="text-[11px] text-zinc-400">Toque em <strong>Instalar Aplicativo</strong>.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full rounded-full bg-zinc-800 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-zinc-700 transition"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
