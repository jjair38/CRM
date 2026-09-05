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
        const monthData: MonthProjection[] = months.map(m => ({
          monthName: format(m.date, 'MMMM', { locale: ptBR }),
          year: m.date.getFullYear(),
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          monthDate: m.date
        }));

        snapshot.docs.forEach(doc => {
          const data = doc.data();
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
      },
      (error) => {
        console.warn('Listener de projeção pausado (permissão):', error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  if (projections.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gold" />
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Projeção Próximos Meses</h3>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-zinc-500">Fluxo de Caixa Mensal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projections.map((proj, index) => (
          <motion.div
            key={`${proj.monthName}-${proj.year}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#111113] p-5 rounded-2xl border border-white/5 hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 group-hover:text-gold transition-colors">
                {proj.monthName} <span className="opacity-30">{proj.year}</span>
              </span>
              <div className="p-1 rounded bg-zinc-900 group-hover:bg-gold/10 transition-colors">
                <ArrowRight size={10} className="text-zinc-600 group-hover:text-gold" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-[#a3e635] opacity-50" />
                  <span className="text-[9px] uppercase text-zinc-500">Entradas</span>
                </div>
                <span className={`text-xs font-medium text-white ${!showValues ? 'blur-[4px]' : ''}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.totalIn)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown size={12} className="text-[#fb7185] opacity-50" />
                  <span className="text-[9px] uppercase text-zinc-500">Saídas</span>
                </div>
                <span className={`text-xs font-medium text-white ${!showValues ? 'blur-[4px]' : ''}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.totalOut)}
                </span>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-400">Saldo</span>
                <span className={`text-sm font-serif ${proj.balance >= 0 ? 'text-gold' : 'text-[#fb7185]'} ${!showValues ? 'blur-[4px]' : ''}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.balance)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
