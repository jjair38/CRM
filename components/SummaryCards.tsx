'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function SummaryCards({ user }: { user: any }) {
  const [summary, setSummary] = useState({
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    pendingOut: 0
  });

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        let totalIn = 0;
        let totalOut = 0;
        let pendingOut = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const value = Number(data.value) || 0;
          
          if (data.type === 'Receita') {
            totalIn += value;
          } else {
            totalOut += value;
            if (data.status === 'Pendente') {
              pendingOut += value;
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

  return (
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
              <span className={`text-2xl font-light ${card.color}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
