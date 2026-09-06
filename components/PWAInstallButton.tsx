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
        className="flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-light text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300 shadow-lg shadow-gold/10"
      >
        <Download size={14} />
        Instalar App
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-4 py-2 border border-border-dark text-zinc-400 hover:bg-white/5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300"
        >
          <PlusSquare size={14} />
          Instalar no iOS
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
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest font-sans">Instalar no iPhone</h3>
                    <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                      Para instalar este app no seu iPhone ou iPad, siga os passos abaixo:
                    </p>
                  </div>

                  <div className="w-full space-y-4 py-4">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-bold">1</div>
                      <p className="text-[11px] text-zinc-400">Toque no botão <strong>Compartilhar</strong> <Share size={14} className="inline mx-1 text-blue-400" /> na barra do Safari.</p>
                    </div>
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-bold">2</div>
                      <p className="text-[11px] text-zinc-400">Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</p>
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
  }

  return null;
};
