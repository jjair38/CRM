'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { format, differenceInDays, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Calendar, ChevronRight, Receipt, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UpcomingAlerts({ user, onEdit, showValues = true }: { user: any, onEdit?: (transaction: any) => void, showValues?: boolean }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleMarkAsPaid = async (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'transactions', transactionId), {
        status: 'Pago',
        paymentDate: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('status', '==', 'Pendente'),
      where('type', '==', 'Despesa')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = startOfDay(new Date());
      const threeDaysFromNow = addDays(today, 3);

      const upcoming = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((t: any) => {
          if (!t.dueDate?.toDate) return false;
          const dueDate = startOfDay(t.dueDate.toDate());
          // Próximos 3 dias ou já vencido (mas ainda pendente)
          return isBefore(dueDate, addDays(threeDaysFromNow, 1));
        })
        .sort((a: any, b: any) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());

      setAlerts(upcoming);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading || alerts.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={14} className="text-[#fbbf24]" />
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#fbbf24]">Atenção: Vencimentos Próximos</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {alerts.map((t) => {
            const daysLeft = differenceInDays(startOfDay(t.dueDate.toDate()), startOfDay(new Date()));
            const isOverdue = daysLeft < 0;
            
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onEdit?.(t)}
                className={`
                  cursor-pointer group p-4 rounded border flex flex-col justify-between transition-all relative overflow-hidden
                  ${isOverdue 
                    ? 'bg-[#fb7185]/5 border-[#fb7185]/20 hover:border-[#fb7185]/40' 
                    : 'bg-[#fbbf24]/5 border-[#fbbf24]/20 hover:border-[#fbbf24]/40'}
                `}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded ${isOverdue ? 'bg-[#fb7185]/20 text-[#fb7185]' : 'bg-[#fbbf24]/20 text-[#fbbf24]'}`}>
                    <Receipt size={14} />
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-[#fb7185]' : 'text-[#fbbf24]'}`}>
                      {isOverdue ? 'Atrasado' : daysLeft === 0 ? 'Vence Hoje' : `Em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}
                    </p>
                    <p className={`text-[14px] font-bold text-white mt-1 transition-all duration-300 ${!showValues ? 'blur-sm select-none' : ''}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-xs font-medium text-white line-clamp-1 group-hover:text-gold transition-colors">{t.description}</h4>
                    <div className="flex items-center gap-2 mt-2 opacity-50">
                      <Calendar size={12} />
                      <span className="text-[10px]">{format(t.dueDate.toDate(), "dd 'de' MMM", { locale: ptBR })}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleMarkAsPaid(e, t.id)}
                    className="p-2 rounded-full bg-white/5 hover:bg-[#a3e635]/20 text-zinc-500 hover:text-[#a3e635] transition-all group/btn"
                    title="Marcar como Pago"
                  >
                    <CheckCircle2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                </div>

                {/* Accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOverdue ? 'bg-[#fb7185]' : 'bg-[#fbbf24]'}`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
