'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  X,
  Check,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SummaryCardKey = 'receitas' | 'despesas' | 'saldo' | 'pendencias';

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function getEffectiveStatus(t: any): 'Pago' | 'Pendente' | 'Atrasado' {
  if (t.status === 'Pago' || t.status === 'Recebido') return 'Pago';
  const due = t.dueDate?.toDate ? t.dueDate.toDate() : null;
  if (!due) return 'Pendente';
  if (startOfDay(due) < startOfDay(new Date())) return 'Atrasado';
  return 'Pendente';
}

export function SummaryCards({
  user,
  showValues = true,
  onEdit
}: {
  user: any;
  showValues?: boolean;
  onEdit?: (transaction: any) => void;
}) {
  const [monthTransactions, setMonthTransactions] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<SummaryCardKey | null>(null);

  const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR });
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user?.uid) return;

    const today = new Date();
    const mStart = startOfMonth(today);
    const mEnd = endOfMonth(today);

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((data: any) => {
            const trxDate = data.dueDate?.toDate ? data.dueDate.toDate() : null;
            return trxDate && isWithinInterval(trxDate, { start: mStart, end: mEnd });
          })
          .sort((a: any, b: any) => {
            const da = a.dueDate?.toDate ? a.dueDate.toDate().getTime() : 0;
            const dbTime = b.dueDate?.toDate ? b.dueDate.toDate().getTime() : 0;
            return da - dbTime;
          });

        setMonthTransactions(list);
      },
      (error) => {
        console.error('Error in SummaryCards snapshot:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedCard) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCard(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard]);

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let pendingOut = 0;
    let paidIn = 0;
    let paidOut = 0;
    let overdueOut = 0;

    monthTransactions.forEach((data: any) => {
      const value = Number(data.value) || 0;
      const isPaid = data.status === 'Pago' || data.status === 'Recebido';
      const effStatus = getEffectiveStatus(data);

      if (data.type === 'Receita') {
        totalIn += value;
        if (isPaid) paidIn += value;
      } else {
        totalOut += value;
        if (isPaid) {
          paidOut += value;
        } else {
          pendingOut += value;
          if (effStatus === 'Atrasado') {
            overdueOut += value;
          }
        }
      }
    });

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      realizedBalance: paidIn - paidOut,
      pendingOut,
      paidIn,
      pendingIn: totalIn - paidIn,
      paidOut,
      overdueOut,
      toDueOut: pendingOut - overdueOut
    };
  }, [monthTransactions]);

  const handleMarkAsPaid = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'transactions', id), {
        status: 'Pago',
        paymentDate: new Date()
      });
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
    }
  };

  const cards: {
    key: SummaryCardKey;
    label: string;
    value: number;
    icon: typeof TrendingUp;
    color: string;
    bg: string;
  }[] = [
    {
      key: 'receitas',
      label: 'Total Receitas',
      value: summary.totalIn,
      icon: TrendingUp,
      color: 'text-[#a3e635]',
      bg: 'bg-emerald-950/20'
    },
    {
      key: 'despesas',
      label: 'Total Despesas',
      value: summary.totalOut,
      icon: TrendingDown,
      color: 'text-[#fb7185]',
      bg: 'bg-rose-950/20'
    },
    {
      key: 'saldo',
      label: 'Saldo Previsto',
      value: summary.balance,
      icon: Wallet,
      color: 'text-white',
      bg: 'bg-zinc-800/20'
    },
    {
      key: 'pendencias',
      label: 'Pendências',
      value: summary.pendingOut,
      icon: AlertCircle,
      color: 'text-[#fbbf24]',
      bg: 'bg-amber-950/20'
    }
  ];

  const budgetPercentage =
    summary.totalIn > 0
      ? Math.min((summary.totalOut / summary.totalIn) * 100, 100)
      : summary.totalOut > 0
      ? 100
      : 0;

  const modalConfig = useMemo(() => {
    if (!selectedCard) return null;

    if (selectedCard === 'receitas') {
      const items = monthTransactions.filter((t) => t.type === 'Receita');
      return {
        title: 'Resumo de Receitas',
        subtitle: `${currentMonthName} ${currentYear} · ${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`,
        icon: TrendingUp,
        iconColor: 'text-[#a3e635]',
        iconBg: 'bg-[#a3e635]/10 border-[#a3e635]/20',
        primaryLabel: 'Total Previsto',
        primaryValue: summary.totalIn,
        primaryColor: 'text-[#a3e635]',
        metrics: [
          { label: 'Já Recebido', value: summary.paidIn, color: 'text-[#a3e635]' },
          { label: 'A Receber', value: summary.pendingIn, color: 'text-[#fbbf24]' }
        ],
        items
      };
    }

    if (selectedCard === 'despesas') {
      const items = monthTransactions.filter((t) => t.type !== 'Receita');
      return {
        title: 'Resumo de Despesas',
        subtitle: `${currentMonthName} ${currentYear} · ${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}`,
        icon: TrendingDown,
        iconColor: 'text-[#fb7185]',
        iconBg: 'bg-[#fb7185]/10 border-[#fb7185]/20',
        primaryLabel: 'Total Previsto',
        primaryValue: summary.totalOut,
        primaryColor: 'text-[#fb7185]',
        metrics: [
          { label: 'Já Pago', value: summary.paidOut, color: 'text-[#a3e635]' },
          { label: 'Em Aberto', value: summary.pendingOut, color: 'text-[#fbbf24]' }
        ],
        items
      };
    }

    if (selectedCard === 'pendencias') {
      const items = monthTransactions.filter(
        (t) => t.type !== 'Receita' && t.status === 'Pendente'
      );
      return {
        title: 'Resumo de Pendências',
        subtitle: `${currentMonthName} ${currentYear} · ${items.length} ${items.length === 1 ? 'conta pendente' : 'contas pendentes'}`,
        icon: AlertCircle,
        iconColor: 'text-[#fbbf24]',
        iconBg: 'bg-[#fbbf24]/10 border-[#fbbf24]/20',
        primaryLabel: 'Total Pendente',
        primaryValue: summary.pendingOut,
        primaryColor: 'text-[#fbbf24]',
        metrics: [
          { label: 'Em Atraso', value: summary.overdueOut, color: 'text-[#fb7185]' },
          { label: 'A Vencer', value: summary.toDueOut, color: 'text-white' }
        ],
        items
      };
    }

    // 'saldo'
    return {
      title: 'Resumo de Saldo Previsto',
      subtitle: `${currentMonthName} ${currentYear} · ${monthTransactions.length} ${monthTransactions.length === 1 ? 'movimentação' : 'movimentações'}`,
      icon: Wallet,
      iconColor: 'text-gold',
      iconBg: 'bg-gold/10 border-gold/20',
      primaryLabel: 'Saldo Líquido Previsto',
      primaryValue: summary.balance,
      primaryColor: summary.balance >= 0 ? 'text-gold' : 'text-[#fb7185]',
      metrics: [
        { label: 'Total Receitas', value: summary.totalIn, color: 'text-[#a3e635]' },
        { label: 'Total Despesas', value: summary.totalOut, color: 'text-[#fb7185]' },
        { label: 'Saldo Já Realizado', value: summary.realizedBalance, color: 'text-white' }
      ],
      items: monthTransactions
    };
  }, [selectedCard, monthTransactions, summary, currentMonthName, currentYear]);

  const blurClass = !showValues ? 'blur-md select-none opacity-25' : 'opacity-100';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gold" />
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">
            Resumo • Mês Vigente
          </h3>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-gold font-bold">
          {currentMonthName} {currentYear}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => setSelectedCard(card.key)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-left bg-card-bg p-5 md:p-8 rounded-[24px] md:rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between h-32 md:h-40 group hover:border-gold/30 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-500 font-bold group-hover:text-gold/80 transition-colors duration-300">
                  {card.label}
                </span>
                <div className={`p-1.5 md:p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${card.bg}`}>
                  <Icon size={14} className={card.color} />
                </div>
              </div>
              <div className="flex items-end justify-between w-full gap-2">
                <span
                  className={`text-xl md:text-3xl font-sans font-bold tracking-tight tabular-nums transition-all duration-700 ${card.color} ${
                    !showValues ? 'blur-lg select-none opacity-20' : 'opacity-100'
                  }`}
                >
                  {formatBRL(card.value)}
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-zinc-600 group-hover:text-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mb-1"
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Budget Progress Bar (also clickable for consolidated summary) */}
      <motion.button
        type="button"
        onClick={() => setSelectedCard('saldo')}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full text-left bg-card-bg p-4 md:p-6 rounded-3xl border border-border-dark hover:border-gold/30 shadow-xl transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4 md:px-2">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] opacity-50 font-black mb-1 group-hover:text-gold transition-colors">
              Comprometimento de Renda
            </span>
            <span className="text-[10px] md:text-xs text-zinc-500 leading-tight">
              Suas despesas ocupam{' '}
              <span className={budgetPercentage > 80 ? 'text-red-400 font-black' : 'text-gold font-black'}>
                {budgetPercentage.toFixed(1)}%
              </span>{' '}
              do faturamento.
            </span>
          </div>
          <span className="text-lg md:text-xl font-sans font-black text-white tabular-nums">
            {budgetPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${budgetPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              budgetPercentage > 90
                ? 'bg-red-500'
                : budgetPercentage > 70
                ? 'bg-amber-500'
                : 'bg-gold'
            } shadow-[0_0_10px_rgba(234,179,8,0.3)]`}
          />
        </div>
      </motion.button>

      {/* Summary Popup Modal */}
      <AnimatePresence>
        {modalConfig && (
          <div
            className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-[#000000]/80 backdrop-blur-md p-0 md:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={modalConfig.title}
          >
            <div className="absolute inset-0" onClick={() => setSelectedCard(null)} />

            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-card-bg w-full max-w-4xl rounded-t-[32px] md:rounded-3xl border-t md:border border-border-dark shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative z-10"
            >
              {/* Mobile Drag Indicator */}
              <div className="md:hidden flex justify-center py-3">
                <div className="w-10 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Header */}
              <div className="p-6 pt-2 md:pt-6 border-b border-border-dark flex items-center justify-between gap-4 bg-[#161618]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${modalConfig.iconBg}`}
                  >
                    <modalConfig.icon size={18} className={modalConfig.iconColor} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider truncate">
                      {modalConfig.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest capitalize truncate">
                      {modalConfig.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="hidden sm:block text-right">
                    <p className="text-[9px] uppercase text-zinc-500 font-bold mb-0.5 tracking-wider">
                      {modalConfig.primaryLabel}
                    </p>
                    <p className={`text-xl font-sans font-bold tabular-nums ${modalConfig.primaryColor} ${blurClass}`}>
                      {formatBRL(modalConfig.primaryValue)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCard(null)}
                    aria-label="Fechar resumo"
                    className="p-2 hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-white active:scale-90 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Metrics Strip inside Popup */}
              <div className="px-6 py-4 bg-zinc-900/30 border-b border-border-dark flex flex-wrap items-center gap-6">
                <div className="sm:hidden">
                  <p className="text-[9px] uppercase text-zinc-500 font-bold">{modalConfig.primaryLabel}</p>
                  <p className={`text-base font-bold tabular-nums ${modalConfig.primaryColor} ${blurClass}`}>
                    {formatBRL(modalConfig.primaryValue)}
                  </p>
                </div>
                {modalConfig.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-[9px] uppercase text-zinc-500 font-bold">{m.label}</p>
                    <p className={`text-sm font-bold tabular-nums ${m.color} ${blurClass}`}>
                      {formatBRL(m.value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Items List */}
              <div className="overflow-y-auto flex-1">
                {modalConfig.items.length === 0 ? (
                  <div className="py-12 px-6 text-center text-zinc-500 text-xs uppercase tracking-widest font-medium">
                    Nenhum lançamento encontrado para este resumo neste mês.
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-2.5">
                      {modalConfig.items.map((trx) => {
                        const effStatus = getEffectiveStatus(trx);
                        const isPaid = effStatus === 'Pago';
                        return (
                          <div
                            key={trx.id}
                            onClick={() => onEdit?.(trx)}
                            className="bg-[#1a1a1c] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0 space-y-1">
                              <p className="text-xs font-bold text-white truncate uppercase">
                                {trx.description}
                              </p>
                              <p className="text-[10px] text-zinc-500 tabular-nums">
                                {trx.dueDate?.toDate ? format(trx.dueDate.toDate(), 'dd/MM') : '---'} · {trx.category} ·{' '}
                                <span
                                  className={
                                    isPaid
                                      ? 'text-[#a3e635]'
                                      : effStatus === 'Atrasado'
                                      ? 'text-[#fb7185]'
                                      : 'text-[#fbbf24]'
                                  }
                                >
                                  {effStatus}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  trx.type === 'Receita' ? 'text-[#a3e635]' : 'text-white'
                                } ${blurClass}`}
                              >
                                {trx.type === 'Receita' ? '+' : '-'} {formatBRL(Number(trx.value) || 0)}
                              </span>
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsPaid(e, trx.id)}
                                  className="p-1.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] cursor-pointer"
                                  title="Confirmar como Pago"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/50">
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">
                              Data
                            </th>
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">
                              Descrição
                            </th>
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">
                              Categoria
                            </th>
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark">
                              Status
                            </th>
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark text-right">
                              Valor
                            </th>
                            <th className="px-6 py-3.5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-border-dark text-center">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {modalConfig.items.map((trx) => {
                            const effStatus = getEffectiveStatus(trx);
                            const isPaid = effStatus === 'Pago';
                            return (
                              <tr key={trx.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-3.5 text-[11px] text-zinc-400 font-medium tabular-nums">
                                  {trx.dueDate?.toDate ? format(trx.dueDate.toDate(), 'dd/MM/yyyy') : '---'}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className="text-[11px] text-white font-medium uppercase group-hover:text-gold transition-colors">
                                    {trx.description}
                                  </span>
                                  {trx.installmentsTotal > 1 && (
                                    <span className="ml-2 text-[9px] text-zinc-500 tabular-nums">
                                      ({trx.installmentCurrent}/{trx.installmentsTotal})
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3.5 text-[11px] text-zinc-400">
                                  {trx.category || 'Geral'}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span
                                    className={`text-[10px] uppercase font-bold ${
                                      isPaid
                                        ? 'text-[#a3e635]'
                                        : effStatus === 'Atrasado'
                                        ? 'text-[#fb7185]'
                                        : 'text-[#fbbf24]'
                                    }`}
                                  >
                                    {effStatus}
                                  </span>
                                </td>
                                <td
                                  className={`px-6 py-3.5 text-right text-xs font-sans font-bold tabular-nums ${
                                    trx.type === 'Receita' ? 'text-[#a3e635]' : 'text-[#fb7185]'
                                  } ${blurClass}`}
                                >
                                  {trx.type === 'Receita' ? '+' : '-'}{' '}
                                  {formatBRL(Number(trx.value) || 0)}
                                </td>
                                <td className="px-6 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {!isPaid && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleMarkAsPaid(e, trx.id)}
                                        className="p-1.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635] hover:text-black transition-all cursor-pointer"
                                        title="Confirmar como Pago"
                                      >
                                        <Check size={13} />
                                      </button>
                                    )}
                                    {onEdit && (
                                      <button
                                        type="button"
                                        onClick={() => onEdit(trx)}
                                        className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                                        title="Editar Lançamento"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    )}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
