'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  addMonths, 
  isWithinInterval, 
  endOfMonth,
  isAfter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updateDoc, doc as firestoreDoc } from 'firebase/firestore';
import { Check } from 'lucide-react';

interface MonthProjection {
  monthName: string;
  year: number;
  totalIn: number;
  totalOut: number;
  balance: number;
  monthDate: Date;
}

export function FutureProjection({ user, showValues = true }: { user: any, showValues?: boolean }) {
  const [projections, setProjections] = useState<MonthProjection[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthProjection | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // We want to see the next 4 months
    const today = new Date();
    const monthsToShow = 4;
    const months = Array.from({ length: monthsToShow }, (_, i) => {
      const d = addMonths(startOfMonth(today), i);
      return {
        date: d,
        start: startOfMonth(d),
        end: endOfMonth(d)
      };
    });

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const trxs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllTransactions(trxs);

        const monthData: MonthProjection[] = months.map(m => ({
          monthName: format(m.date, 'MMMM', { locale: ptBR }),
          year: m.date.getFullYear(),
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          monthDate: m.date
        }));

        trxs.forEach((data: any) => {
          const value = Number(data.value) || 0;
          const trxDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;

          if (trxDate) {
            monthData.forEach(mProj => {
              const mStart = startOfMonth(mProj.monthDate);
              const mEnd = endOfMonth(mProj.monthDate);
              
              if (isWithinInterval(trxDate, { start: mStart, end: mEnd })) {
                if (data.type === 'Receita') {
                  mProj.totalIn += value;
                } else {
                  mProj.totalOut += value;
                }
              }
            });
          }
        });

        monthData.forEach(m => {
          m.balance = m.totalIn - m.totalOut;
        });

        setProjections(monthData);
        
        // Default select current month if none selected
        if (!selectedMonth) {
          setSelectedMonth(monthData[0]);
        }
      },
      (error) => {
        console.warn('Listener de projeção pausado (permissão):', error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleMarkAsPaid = async (id: string) => {
    try {
      const trxRef = firestoreDoc(db, 'transactions', id);
      await updateDoc(trxRef, { status: 'Pago' });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao confirmar pagamento.');
    }
  };

  if (projections.length === 0) return null;

  const selectedMonthTransactions = allTransactions.filter(t => {
    if (!selectedMonth) return false;
    const trxDate = t.dueDate?.toDate ? t.dueDate.toDate() : null;
    if (!trxDate) return false;
    return isWithinInterval(trxDate, { 
      start: startOfMonth(selectedMonth.monthDate), 
      end: endOfMonth(selectedMonth.monthDate) 
    });
  }).sort((a, b) => {
    const dateA = a.dueDate?.toDate ? a.dueDate.toDate().getTime() : 0;
    const dateB = b.dueDate?.toDate ? b.dueDate.toDate().getTime() : 0;
    return dateA - dateB;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gold" />
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Projeção Próximos Meses</h3>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500">Clique em um mês para detalhar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projections.map((proj, index) => (
            <motion.div
              key={`${proj.monthName}-${proj.year}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setSelectedMonth(proj)}
              className={`p-6 rounded-3xl border cursor-pointer transition-all duration-500 group ${
                selectedMonth?.monthName === proj.monthName && selectedMonth?.year === proj.year
                ? 'bg-gold/10 border-gold/40 shadow-2xl shadow-gold/5'
                : 'bg-card-bg border-white/5 hover:border-gold/20'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <span className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-colors duration-500 ${
                  selectedMonth?.monthName === proj.monthName && selectedMonth?.year === proj.year
                  ? 'text-gold'
                  : 'text-zinc-500 group-hover:text-gold/60'
                }`}>
                  {proj.monthName} <span className="opacity-20">{proj.year}</span>
                </span>
                <div className={`p-1.5 rounded-lg transition-all duration-500 ${
                  selectedMonth?.monthName === proj.monthName && selectedMonth?.year === proj.year
                  ? 'bg-gold text-black shadow-lg shadow-gold/20'
                  : 'bg-zinc-900 text-zinc-600 group-hover:bg-gold/10 group-hover:text-gold'
                }`}>
                  <ArrowRight size={12} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-lime-vibrant opacity-40" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Entradas</span>
                  </div>
                  <span className={`text-sm font-medium text-white ${!showValues ? 'blur-[5px]' : ''}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.totalIn)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-rose-soft opacity-40" />
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Saídas</span>
                  </div>
                  <span className={`text-sm font-medium text-white ${!showValues ? 'blur-[5px]' : ''}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.totalOut)}
                  </span>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Saldo</span>
                  <span className={`text-lg font-sans font-bold ${proj.balance >= 0 ? 'text-gold' : 'text-rose-soft'} ${!showValues ? 'blur-[6px]' : ''}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.balance)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* DETAILED VIEW SECTION */}
      {selectedMonth && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={selectedMonth.monthName}
          className="bg-card-bg rounded-2xl border border-border-dark overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-border-dark flex items-center justify-between bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                <Calendar size={18} className="text-gold" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Detalhamento Mensal</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{selectedMonth.monthName} {selectedMonth.year}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1 tracking-tighter">Saldo Líquido Previsto</p>
              <p className={`text-xl font-sans font-bold ${selectedMonth.balance >= 0 ? 'text-gold' : 'text-[#fb7185]'} ${!showValues ? 'blur-[8px]' : ''}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonth.balance)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">Data</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">Descrição</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">Categoria</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">Parcela</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark text-center">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedMonthTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 text-xs uppercase tracking-widest font-medium italic">
                      Nenhum lançamento previsto para este mês.
                    </td>
                  </tr>
                ) : (
                  selectedMonthTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[11px] text-zinc-400 font-medium">
                        {trx.dueDate?.toDate ? format(trx.dueDate.toDate(), 'dd/MM/yyyy') : '---'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] text-white font-medium group-hover:text-gold transition-colors uppercase">{trx.description}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5 uppercase font-bold tracking-tighter">
                          {trx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-zinc-500 font-bold">
                        {trx.installmentCurrent && trx.installmentsTotal 
                          ? `${trx.installmentCurrent}/${trx.installmentsTotal}`
                          : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          trx.status === 'Pago' ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'bg-gold/10 text-gold'
                        }`}>
                          {trx.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right text-xs font-sans font-bold ${
                        trx.type === 'Receita' ? 'text-[#a3e635]' : 'text-[#fb7185]'
                      } ${!showValues ? 'blur-[4px]' : ''}`}>
                        {trx.type === 'Receita' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trx.value)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {trx.status === 'Pendente' && (
                          <button
                            onClick={() => handleMarkAsPaid(trx.id)}
                            className="p-1.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635] hover:text-black transition-all group/btn"
                            title="Confirmar como Pago"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-zinc-900/20 border-t border-border-dark flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/20">
                <TrendingUp size={14} className="text-[#a3e635]" />
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-bold">Total Receitas</p>
                <p className={`text-sm text-white font-sans font-bold ${!showValues ? 'blur-[4px]' : ''}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonth.totalIn)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#fb7185]/10 border border-[#fb7185]/20">
                <TrendingDown size={14} className="text-[#fb7185]" />
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-bold">Total Despesas</p>
                <p className={`text-sm text-white font-sans font-bold ${!showValues ? 'blur-[4px]' : ''}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonth.totalOut)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
