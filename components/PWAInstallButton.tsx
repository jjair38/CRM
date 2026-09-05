'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se já estiver instalado ou rodando como app, não mostra nada
  if (isInstalled) return null;

  // Fluxo para Android / Desktop (Chrome/Edge)
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium transition-all bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-black mt-4"
      >
        <Download size={16} />
        Instalar Aplicativo
      </button>
    );
  }

  // Fluxo para iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium transition-all bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-black mt-4"
        >
          <Download size={16} />
          Instalar no iPhone
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm rounded-2xl bg-[#111113] p-8 border border-white/10 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold/20">
                    <Download className="text-gold w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Instalar no iPhone</h3>
                </div>

                <div className="space-y-6 text-zinc-400 text-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">1</div>
                    <p>Toque no ícone de <span className="inline-flex items-center text-white font-bold gap-1"><Share size={14} className="text-blue-400" /> Compartilhar</span> na barra inferior do Safari.</p>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">2</div>
                    <p>Role para baixo e toque em <span className="text-white font-bold text-xs uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded">Adicionar à Tela de Início</span>.</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-8 w-full rounded-xl bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Entendi
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
}
