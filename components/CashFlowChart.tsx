'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowChartProps {
  user: any;
  showValues?: boolean;
}

export function CashFlowChart({ user, showValues = true }: CashFlowChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
    
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('date', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));

      // Group by month
      const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
          month: format(date, 'MMM', { locale: ptBR }),
          fullName: format(date, 'MMMM yyyy', { locale: ptBR }),
          date,
          entradas: 0,
          saidas: 0,
        };
      });

      transactions.forEach((t: any) => {
        const tDate = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date);
        
        last6Months.forEach(m => {
          if (isWithinInterval(tDate, { start: startOfMonth(m.date), end: endOfMonth(m.date) })) {
            if (t.type === 'Receita') {
              m.entradas += Number(t.value);
            } else {
              m.saidas += Number(t.value);
            }
          }
        });
      });

      setData(last6Months);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111113] border border-white/10 p-3 rounded shadow-2xl">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{payload[0].payload.fullName}</p>
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#a3e635]">
              Entradas: {showValues 
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)
                : 'R$ ••••••'}
            </p>
            <p className="text-xs font-bold text-white">
              Saídas: {showValues 
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[1].value)
                : 'R$ ••••••'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }}
            dy={10}
            className="uppercase tracking-widest"
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 9 }}
            tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
          <Bar 
            name="Entradas" 
            dataKey="entradas" 
            fill="#a3e635" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
          />
          <Bar 
            name="Saídas" 
            dataKey="saidas" 
            fill="#ffffff" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
