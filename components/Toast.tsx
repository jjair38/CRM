'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, CheckCircle2, Info } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', isVisible, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const icons = {
    info: <Info size={18} className="text-blue-400" />,
    warning: <AlertCircle size={18} className="text-[#fbbf24]" />,
    success: <CheckCircle2 size={18} className="text-[#a3e635]" />,
    error: <AlertCircle size={18} className="text-red-400" />,
  };

  const bgColors = {
    info: 'bg-blue-500/10 border-blue-500/20',
    warning: 'bg-[#fbbf24]/10 border-[#fbbf24]/20',
    success: 'bg-[#a3e635]/10 border-[#a3e635]/20',
    error: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
          className={`
            fixed bottom-10 left-1/2 z-[100] min-w-[320px] max-w-[90vw] p-4 rounded-2xl border backdrop-blur-xl shadow-2xl
            flex items-start gap-4 transition-all
            ${bgColors[type]}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {icons[type]}
          </div>
          
          <div className="flex-1 space-y-1">
            <p className="text-[11px] font-bold text-white uppercase tracking-widest">Notificação</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>
          </div>

          <button 
            onClick={onClose}
            className="shrink-0 p-1 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
