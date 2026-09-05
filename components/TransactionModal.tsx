'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    paymentMethod: 'PIX'
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (initialData) {
      setFormData({
        description: initialData.description || '',
        value: initialData.value?.toString() || '',
        type: initialData.type || 'Despesa',
        dueDate: initialData.dueDate?.toDate ? initialData.dueDate.toDate().toISOString().split('T')[0] : today,
        category: initialData.category || 'Geral',
        status: initialData.status || 'Pendente',
        paymentMethod: initialData.paymentMethod || 'PIX'
      });
    } else {
      setFormData({
        description: '',
        value: '',
        type: 'Despesa',
        dueDate: today,
        category: 'Geral',
        status: 'Pendente',
        paymentMethod: 'PIX'
      });
    }
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

    // Fechamento e limpeza IMEDIATA para experiência instantânea
    const closeModalInstantly = () => {
      setFormData({
        description: '',
        value: '',
        type: 'Despesa',
        dueDate: formatInputDate(new Date()),
        category: 'Geral',
        status: 'Pendente',
        paymentMethod: 'PIX'
      });
      onClose();
    };

    const path = 'transactions';
    try {
      // Robust date parsing for YYYY-MM-DD
      const [year, month, day] = formData.dueDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);

      if (isNaN(dateObj.getTime())) {
        throw new Error('Data inválida');
      }

      const payload = {
        description: formData.description,
        value: Number(formData.value),
        type: formData.type,
        dueDate: Timestamp.fromDate(dateObj),
        category: formData.category,
        status: formData.status,
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      if (initialData?.id) {
        // Update existing transaction - No await for instant feel
        updateDoc(doc(db, path, initialData.id), payload)
          .catch(error => handleFirestoreError(error, OperationType.UPDATE, `${path}/${initialData.id}`));
      } else {
        // Create new transaction - No await for instant feel
        addDoc(collection(db, path), {
          ...payload,
          createdAt: Timestamp.now()
        }).catch(error => handleFirestoreError(error, OperationType.CREATE, path));
      }

      closeModalInstantly();
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      alert('Erro ao preparar o lançamento. Verifique os dados.');
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
            className="bg-card-bg w-full max-w-md rounded border border-border-dark shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border-dark flex items-center justify-between bg-[#161618]">
              <h3 className="text-lg font-light text-white font-serif tracking-widest uppercase">
                {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded transition-all text-zinc-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Descrição</label>
                <input
                  required
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Aluguel, Venda de Produto..."
                  className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm placeholder:opacity-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Valor (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Vencimento</label>
                  <input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm invert opacity-80"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago/Recebido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 mb-2">Categoria</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded px-4 py-3 focus:outline-none focus:border-gold transition-all text-white text-sm appearance-none"
                >
                  <option value="Geral">Geral</option>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Pessoal">Pessoal</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Utilidades">Utilidades (Luz, Água)</option>
                </select>
              </div>

              <div className="pt-6">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-gold hover:bg-white text-black font-bold py-4 px-6 rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-gold/10 uppercase text-[11px] tracking-[0.2em]"
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
