'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 bg-gold hover:bg-white text-black px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-gold/10 transition-all"
      >
        <Download size={14} />
        Instalar App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 border border-border-dark text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
        >
          <Smartphone size={14} />
          Instalar no iOS
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm rounded-2xl bg-card-bg p-8 border border-border-dark shadow-2xl relative"
              >
                <button onClick={() => setShowIOSGuide(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                <h3 className="text-xl font-serif text-white mb-4">Instalar no iPhone / iPad</h3>
                <div className="space-y-4 text-zinc-400 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white shrink-0">1</div>
                    <p>Toque no botão de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-white shrink-0">2</div>
                    <p>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</p>
                  </div>
                </div>
                <button onClick={() => setShowIOSGuide(false)} className="mt-8 w-full rounded-full bg-zinc-800 py-3 text-sm font-bold text-white hover:bg-zinc-700 transition-all">Entendi</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
