'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MoreHorizontal, 
  Plus, 
  Receipt, 
  Filter, 
  ChevronRight, 
  Pencil, 
  Trash2, 
  Search, 
  Loader2,
  Home,
  ShoppingBag,
  Car,
  Utensils,
  Smartphone,
  CreditCard,
  Briefcase,
  Heart,
  Lightbulb,
  GraduationCap,
  Banknote
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  'Aluguel': Home,
  'Moradia': Home,
  'Mercado': ShoppingBag,
  'Compras': ShoppingBag,
  'Transporte': Car,
  'Combustível': Car,
  'Alimentação': Utensils,
  'Restaurante': Utensils,
  'Educação': GraduationCap,
  'Lazer': Heart,
  'Saúde': Heart,
  'Serviços': Smartphone,
  'Contas': Lightbulb,
  'Energia': Lightbulb,
  'Água': Lightbulb,
  'Salário': Banknote,
  'Renda': Banknote,
  'Trabalho': Briefcase,
  'Cartão de Crédito': CreditCard,
  'Outros': Receipt
};

export function TransactionsList({ user, compact = false, onEdit, showValues = true }: { user: any, compact?: boolean, onEdit?: (transaction: any) => void, showValues?: boolean }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pago' | 'Pendente' | 'Atrasado'>('Todos');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getTransactionStatus = (t: any) => {
    if (t.status === 'Pago' || t.status === 'Recebido') return 'Pago';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    if (dueDate < today) return 'Atrasado';
    return 'Pendente';
  };

  useEffect(() => {
    if (!user?.uid) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const path = 'transactions';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          _date: (doc.data() as any).dueDate?.toDate?.() || new Date(0)
        }));
        
        list.sort((a: any, b: any) => b._date.getTime() - a._date.getTime());
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleDelete = async (id: string) => {
    if (!user?.uid) {
      alert('Usuário não autenticado.');
      return;
    }

    console.log('[DELETE] Usuário:', user.uid);
    console.log('[DELETE] ID do Documento:', id);
    
    const isConfirmed = window.confirm('Deseja excluir este lançamento permanentemente?');
    if (!isConfirmed) return;

    setDeletingId(id);
    const path = `transactions/${id}`;
    try {
      const docRef = doc(db, 'transactions', id);
      console.log('[DELETE] Caminho:', docRef.path);
      await deleteDoc(docRef);
      console.log('[DELETE] Sucesso!');
    } catch (error) {
      console.error('[DELETE] Erro:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const actualStatus = getTransactionStatus(t);
    const matchesStatus = statusFilter === 'Todos' || actualStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] uppercase tracking-widest opacity-40">Sincronizando lançamentos...</p>
      </div>
    );
  }

  const listToRender = compact ? filteredTransactions.slice(0, 5) : filteredTransactions;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Histórico de Lançamentos</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1a1a1c] border border-[#2a2a2e] rounded-full px-3 py-1">
              <Filter size={12} className="text-zinc-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-[11px] uppercase tracking-wider text-zinc-400 focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#1a1a1c]">Todos Status</option>
                <option value="Pago" className="bg-[#1a1a1c]">Pagos</option>
                <option value="Pendente" className="bg-[#1a1a1c]">Pendentes</option>
                <option value="Atrasado" className="bg-[#1a1a1c]">Atrasados</option>
              </select>
            </div>

            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input 
                type="text"
                placeholder="Pesquisar descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1c] border border-[#2a2a2e] rounded-full pl-10 pr-4 py-2 text-[12px] focus:outline-none focus:border-gold transition-all text-white placeholder:text-zinc-700"
              />
            </div>
          </div>
        </div>
      )}

      {listToRender.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border-dark rounded">
          <p className="text-zinc-500 text-sm">Nenhum resultado encontrado para sua busca.</p>
        </div>
      ) : (
        <>
          {/* Card View for Mobile - Compact 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2 md:hidden px-1">
            {listToRender.map((t) => {
              const Icon = CATEGORY_ICONS[t.category] || (t.type === 'Receita' ? Plus : Receipt);
              const actualStatus = getTransactionStatus(t);
              return (
                <div 
                  key={t.id} 
                  onClick={() => onEdit?.(t)}
                  className={`bg-card-bg p-4 rounded-[24px] border border-white/5 shadow-xl active:scale-[0.96] transition-all duration-300 hover:border-gold/20 flex flex-col justify-between group ${deletingId === t.id ? 'opacity-30 pointer-events-none' : ''}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${t.type === 'Receita' ? 'bg-lime-vibrant/10 text-lime-vibrant' : 'bg-rose-soft/10 text-rose-soft'}`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-[8px] uppercase tracking-widest text-zinc-600 font-black">{t.dueDate?.toDate ? format(t.dueDate.toDate(), "dd MMM", { locale: ptBR }) : '---'}</p>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-white font-black text-[11px] leading-tight truncate group-hover:text-gold transition-colors duration-500 uppercase">{t.description}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[7px] uppercase tracking-tighter text-zinc-500 font-bold truncate">{t.category}</p>
                        {t.installmentsTotal > 1 && (
                          <span className="text-[7px] text-gold/30 font-black">
                            {t.installmentCurrent}/{t.installmentsTotal}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <p className={`text-[13px] font-sans font-black ${t.type === 'Receita' ? 'text-lime-vibrant' : 'text-white'} ${!showValues ? 'blur-md select-none opacity-20' : 'opacity-100'}`}>
                      {t.type === 'Receita' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] uppercase font-black border transition-all duration-500 ${
                        actualStatus === 'Pago' ? 'bg-lime-vibrant/10 text-lime-vibrant border-lime-vibrant/20' : 
                        actualStatus === 'Pendente' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-rose-soft/10 text-rose-soft border-rose-soft/20'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${
                          actualStatus === 'Pago' ? 'bg-lime-vibrant' : 
                          actualStatus === 'Pendente' ? 'bg-amber-500' : 'bg-rose-soft'
                        }`}></div>
                        {actualStatus}
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.id);
                        }}
                        className="text-zinc-800 hover:text-rose-soft p-1 transition-colors duration-300"
                      >
                        {deletingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table View for Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-border-dark text-[10px] uppercase tracking-wider opacity-40">
                <th className="px-4 py-3 font-normal">Descrição</th>
                <th className="px-4 py-3 font-normal text-right">Valor</th>
                <th className="px-4 py-3 font-normal">Vencimento</th>
                {!compact && <th className="px-4 py-3 font-normal">Categoria</th>}
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listToRender.map((t) => {
                const Icon = CATEGORY_ICONS[t.category] || (t.type === 'Receita' ? Plus : Receipt);
                const actualStatus = getTransactionStatus(t);
                
                return (
                  <tr 
                    key={t.id} 
                    className={`border-b border-border-dark hover:bg-[#161618] transition-colors group ${deletingId === t.id ? 'opacity-30 pointer-events-none' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${t.type === 'Receita' ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'bg-[#fb7185]/10 text-[#fb7185]'}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{t.description}</span>
                          {t.installmentsTotal > 1 && (
                            <span className="text-[9px] text-gold/40 font-bold uppercase tracking-tighter">
                              Parcela {t.installmentCurrent} de {t.installmentsTotal} • {t.installmentsTotal - t.installmentCurrent} restantes
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-right font-medium transition-all duration-300 ${t.type === 'Receita' ? 'text-[#a3e635]' : 'text-white'} ${!showValues ? 'blur-sm select-none' : ''}`}>
                      {t.type === 'Receita' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                    </td>
                    <td className="px-4 py-4 opacity-60">
                      {t.dueDate?.toDate ? format(t.dueDate.toDate(), "dd/MM/yyyy") : '---'}
                    </td>
                    {!compact && (
                      <td className="px-4 py-4 opacity-60">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                          {t.category}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                        actualStatus === 'Pago' ? 'bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]/20' : 
                        actualStatus === 'Pendente' ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20' : 
                        'bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/20'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${
                          actualStatus === 'Pago' ? 'bg-[#a3e635]' : 
                          actualStatus === 'Pendente' ? 'bg-[#fbbf24]' : 'bg-[#fb7185]'
                        }`}></div>
                        {actualStatus}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(t);
                          }}
                          className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id);
                          }}
                          disabled={deletingId === t.id}
                          className={`p-2.5 rounded-lg transition-all ${deletingId === t.id ? 'text-zinc-700' : 'text-zinc-500 hover:text-red-400 hover:bg-red-400/10'}`}
                          title="Excluir"
                        >
                          {deletingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>
);
}
