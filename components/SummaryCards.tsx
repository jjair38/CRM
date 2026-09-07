'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SummaryCards({ user, showValues = true }: { user: any, showValues?: boolean }) {
  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    pendingOut: 0
  });

  const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR });
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user?.uid) return;

    const today = new Date();
    const mStart = startOfMonth(today);
    const mEnd = endOfMonth(today);

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        let totalIn = 0;
        let totalOut = 0;
        let pendingOut = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const value = Number(data.value) || 0;
          const trxDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
          
          if (trxDate && isWithinInterval(trxDate, { start: mStart, end: mEnd })) {
            if (data.type === 'Receita') {
              totalIn += value;
            } else {
              totalOut += value;
              if (data.status === 'Pendente') {
                pendingOut += value;
              }
            }
          }
        });

        setSummary({
          totalIn,
          totalOut,
          balance: totalIn - totalOut,
          pendingOut
        });
      },
      (error) => {
        console.error("Error in SummaryCards snapshot:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const cards = [
    {
      label: 'Total Receitas',
      value: summary.totalIn,
      icon: TrendingUp,
      color: 'text-[#a3e635]',
      bg: 'bg-emerald-950/20'
    },
    {
      label: 'Total Despesas',
      value: summary.totalOut,
      icon: TrendingDown,
      color: 'text-[#fb7185]',
      bg: 'bg-rose-950/20'
    },
    {
      label: 'Saldo Previsto',
      value: summary.balance,
      icon: Wallet,
      color: 'text-white',
      bg: 'bg-zinc-800/20'
    },
    {
      label: 'Pendências',
      value: summary.pendingOut,
      icon: AlertCircle,
      color: 'text-[#fbbf24]',
      bg: 'bg-amber-950/20'
    }
  ];

  const budgetPercentage = summary.totalIn > 0 
    ? Math.min((summary.totalOut / summary.totalIn) * 100, 100) 
    : summary.totalOut > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gold" />
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Resumo • Mês Vigente</h3>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{currentMonthName} {currentYear}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card-bg p-5 md:p-8 rounded-[24px] md:rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between h-32 md:h-40 group hover:border-gold/20 transition-all duration-500"
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-500 font-bold group-hover:text-gold/60 transition-colors duration-500">{card.label}</span>
                <div className={`p-1.5 md:p-2 rounded-xl transition-all duration-500 group-hover:scale-110 ${card.bg}`}>
                  <Icon size={14} className={card.color} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className={`text-xl md:text-3xl font-sans font-bold tracking-tight transition-all duration-700 ${card.color} ${!showValues ? 'blur-lg select-none opacity-20' : 'opacity-100'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Budget Progress Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card-bg p-4 md:p-6 rounded-3xl border border-border-dark shadow-xl"
      >
        <div className="flex items-center justify-between mb-4 md:px-2">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] opacity-50 font-black mb-1">Comprometimento de Renda</span>
            <span className="text-[10px] md:text-xs text-zinc-500 leading-tight">Suas despesas ocupam <span className={budgetPercentage > 80 ? 'text-red-400 font-black' : 'text-gold font-black'}>{budgetPercentage.toFixed(1)}%</span> do faturamento.</span>
          </div>
          <span className="text-lg md:text-xl font-sans font-black text-white">{budgetPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${budgetPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              budgetPercentage > 90 ? 'bg-red-500' : 
              budgetPercentage > 70 ? 'bg-amber-500' : 
              'bg-gold'
            } shadow-[0_0_10px_rgba(234,179,8,0.3)]`}
          />
        </div>
      </motion.div>
    </div>
  );
}
