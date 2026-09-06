'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, waitForPendingWrites, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { X, Loader2, CheckCircle2, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addWeeks, addMonths, addDays } from 'date-fns';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  initialData?: any;
}

export function TransactionModal({ isOpen, onClose, user, initialData }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    type: 'Despesa',
    dueDate: '',
    category: 'Geral',
    status: 'Pendente',
    paymentMethod: 'PIX',
    installmentsTotal: '1',
    installmentCurrent: '1',
    isRecurring: false,
    recurringFrequency: 'mensal',
    recurringRepetitions: '1'
  });

  useEffect(() => {
    if (!isOpen) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Use a function to ensure we don't trigger cascading renders if not needed
    const updateForm = () => {
      if (initialData) {
        setFormData({
          description: initialData.description || '',
          value: initialData.value?.toString() || '',
          type: initialData.type || 'Despesa',
          dueDate: initialData.dueDate?.toDate ? initialData.dueDate.toDate().toISOString().split('T')[0] : today,
          category: initialData.category || 'Geral',
          status: initialData.status || 'Pendente',
          paymentMethod: initialData.paymentMethod || 'PIX',
          installmentsTotal: initialData.installmentsTotal?.toString() || '1',
          installmentCurrent: initialData.installmentCurrent?.toString() || '1',
          isRecurring: false,
          recurringFrequency: 'mensal',
          recurringRepetitions: '1'
        });
      } else {
        setFormData({
          description: '',
          value: '',
          type: 'Despesa',
          dueDate: today,
          category: 'Geral',
          status: 'Pendente',
          paymentMethod: 'PIX',
          installmentsTotal: '1',
          installmentCurrent: '1',
          isRecurring: false,
          recurringFrequency: 'mensal',
          recurringRepetitions: '1'
        });
      }
    };

    updateForm();
  }, [initialData, isOpen]);

  function formatInputDate(date: Date) {
    return date.toISOString().split('T')[0];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.value) {
      alert('Por favor, preencha a descrição e o valor.');
      return;
    }

    if (!user?.uid) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    setLoading(true);
    const path = 'transactions';
    try {
      const [year, month, day] = formData.dueDate.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day);

      if (isNaN(baseDate.getTime())) {
        throw new Error('Data inválida');
      }

      if (initialData?.id) {
        // Update existing transaction
        const payload = {
          description: formData.description,
          value: Number(formData.value),
          type: formData.type,
          dueDate: Timestamp.fromDate(baseDate),
          category: formData.category,
          status: formData.status,
          installmentsTotal: Number(formData.installmentsTotal) || 1,
          installmentCurrent: Number(formData.installmentCurrent) || 1,
          userId: user.uid,
          updatedAt: Timestamp.now()
        };
        await updateDoc(doc(db, path, initialData.id), payload);
      } else if (formData.isRecurring) {
        // Create multiple transactions for recurrence
        const repetitions = Number(formData.recurringRepetitions);
        const batch = writeBatch(db);
        
        for (let i = 0; i < repetitions; i++) {
          let nextDate = new Date(baseDate);
          if (formData.recurringFrequency === 'semanal') {
            nextDate = addWeeks(baseDate, i);
          } else if (formData.recurringFrequency === 'quinzenal') {
            nextDate = addDays(baseDate, i * 14);
          } else if (formData.recurringFrequency === 'mensal') {
            nextDate = addMonths(baseDate, i);
          }

          const newDocRef = doc(collection(db, path));
          batch.set(newDocRef, {
            description: formData.description,
            value: Number(formData.value),
            type: formData.type,
            dueDate: Timestamp.fromDate(nextDate),
            category: formData.category,
            status: formData.status,
            installmentsTotal: repetitions,
            installmentCurrent: i + 1,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            recurringId: 'rec_' + Date.now() // Optional: link them
          });
        }
        await batch.commit();
      } else {
        // Create single new transaction
        await addDoc(collection(db, path), {
          description: formData.description,
          value: Number(formData.value),
          type: formData.type,
          dueDate: Timestamp.fromDate(baseDate),
          category: formData.category,
          status: formData.status,
          installmentsTotal: Number(formData.installmentsTotal) || 1,
          installmentCurrent: Number(formData.installmentCurrent) || 1,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      try {
        await waitForPendingWrites(db);
      } catch (syncError) {
        console.warn('Sincronização pendente', syncError);
      }

      onClose();
    } catch (error: any) {
      handleFirestoreError(error, initialData?.id ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-card-bg w-full max-w-md rounded-3xl border border-border-dark shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-border-dark flex items-center justify-between bg-[#161618]">
              <h3 className="text-lg font-bold text-white font-sans uppercase tracking-widest">
                {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-all text-zinc-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Descrição</label>
                <input
                  required
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Aluguel, Venda de Produto..."
                  className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm placeholder:opacity-20 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Valor (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none font-sans"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Vencimento</label>
                  <input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none font-sans"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago/Recebido</option>
                  </select>
                </div>
              </div>

              {!initialData && (
                <div className="bg-[#161618] p-4 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="text-gold" />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">Lançamento Recorrente</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                      className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${formData.isRecurring ? 'bg-gold' : 'bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${formData.isRecurring ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  {formData.isRecurring && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5"
                    >
                      <div>
                        <label className="block text-[9px] uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2">Frequência</label>
                        <select
                          value={formData.recurringFrequency}
                          onChange={e => setFormData({ ...formData, recurringFrequency: e.target.value })}
                          className="w-full bg-[#0c0c0d] border border-white/5 rounded-lg px-3 py-2 focus:outline-none focus:border-gold transition-all text-white text-[11px] appearance-none font-sans"
                        >
                          <option value="semanal">Semanal</option>
                          <option value="quinzenal">Quinzenal</option>
                          <option value="mensal">Mensal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-[0.1em] font-bold text-zinc-500 mb-2">Repetições</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={formData.recurringRepetitions}
                          onChange={e => setFormData({ ...formData, recurringRepetitions: e.target.value })}
                          className="w-full bg-[#0c0c0d] border border-white/5 rounded-lg px-3 py-2 focus:outline-none focus:border-gold transition-all text-white text-[11px] font-sans"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Categoria</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-xl px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none font-sans"
                >
                  <option value="Geral">Geral</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Utilidades">Utilidades (Luz, Água)</option>
                  <option value="Mercado">Mercado</option>
                  <option value="Lazer">Lazer</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-light text-black font-bold py-4 px-6 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-gold/10 uppercase text-[11px] tracking-[0.2em]"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : initialData ? 'Atualizar Dados' : 'Processar Lançamento'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
