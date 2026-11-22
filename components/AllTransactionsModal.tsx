'use client';

import React, { useEffect } from 'react';
import { Receipt, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionsList } from '@/components/TransactionsList';

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onEdit: (transaction: any) => void;
  onNewTransaction?: () => void;
  showValues?: boolean;
}

export function AllTransactionsModal({
  isOpen,
  onClose,
  user,
  onEdit,
  onNewTransaction,
  showValues = true
}: AllTransactionsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-[#000000]/80 backdrop-blur-md p-0 md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Todos os Lançamentos"
        >
          {/* Backdrop Click area to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="bg-card-bg w-full max-w-5xl rounded-t-[32px] md:rounded-3xl border-t md:border border-border-dark shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative z-10"
          >
            {/* Mobile Drag Indicator */}
            <div className="md:hidden flex justify-center py-3">
              <div className="w-10 h-1 bg-white/10 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-5 pt-2 md:pt-5 border-b border-border-dark flex items-center justify-between gap-4 bg-[#161618]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 shrink-0">
                  <Receipt size={18} className="text-gold" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                    Todos os Lançamentos
                  </h4>
                  <p className="text-[11px] text-zinc-500 truncate">
                    Pesquise, filtre por status ou edite qualquer movimentação
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {onNewTransaction && (
                  <button
                    type="button"
                    onClick={onNewTransaction}
                    className="bg-gold hover:bg-gold-light text-black px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Novo Lançamento</span>
                    <span className="sm:hidden">Novo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar popup de lançamentos"
                  className="p-2 hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-white active:scale-90 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 md:p-8 overflow-y-auto flex-1">
              <TransactionsList
                user={user}
                onEdit={onEdit}
                showValues={showValues}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
