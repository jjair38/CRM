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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card-bg p-6 rounded border border-border-dark shadow-xl flex flex-col justify-between h-32"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-bold">{card.label}</span>
                <div className={`p-1.5 rounded ${card.bg}`}>
                  <Icon size={14} className={card.color} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className={`text-2xl font-light transition-all duration-300 ${card.color} ${!showValues ? 'blur-md select-none' : ''}`}>
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
        className="bg-card-bg p-6 rounded border border-border-dark shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-bold mb-1">Comprometimento de Renda</span>
            <span className="text-xs text-zinc-400">Suas despesas ocupam <span className={budgetPercentage > 80 ? 'text-red-400 font-bold' : 'text-gold font-bold'}>{budgetPercentage.toFixed(1)}%</span> do seu faturamento total.</span>
          </div>
          <span className="text-xl font-serif text-white">{budgetPercentage.toFixed(0)}%</span>
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
