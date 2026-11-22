'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Layers,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  isWithinInterval,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = 'month' | '6m' | 'year' | 'all';
type GroupByMode = 'description' | 'category';
type TypeFilter = 'Despesa' | 'Receita';
type BreakdownTypeFilter = 'Todos' | 'Despesa' | 'Receita';

interface TransactionItem {
  id: string;
  description: string;
  value: number;
  type: 'Receita' | 'Despesa' | string;
  category: string;
  status: string;
  dueDate?: { toDate?: () => Date } | Date | string;
}

const SLICE_COLORS = [
  '#c5a059', // gold
  '#a3e635', // lime
  '#fb7185', // rose
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#a78bfa', // violet
  '#34d399', // emerald
  '#94a3b8'  // slate
];

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function parseDueDate(raw: TransactionItem['dueDate']): Date | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'toDate' in raw && typeof raw.toDate === 'function') {
    return raw.toDate();
  }
  if (raw instanceof Date) return raw;
  const parsed = new Date(raw as string);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getEffectiveStatus(t: TransactionItem): 'Pago' | 'Pendente' | 'Atrasado' {
  if (t.status === 'Pago' || t.status === 'Recebido') return 'Pago';
  const due = parseDueDate(t.dueDate);
  if (!due) return 'Pendente';
  const today = startOfDay(new Date());
  if (startOfDay(due) < today) return 'Atrasado';
  return 'Pendente';
}

function normalizeLabel(raw: string | undefined, fallback: string): string {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  return trimmed || fallback;
}

export function FinancialDashboard({
  user,
  showValues = true,
  onNewTransaction,
  onSeeAll
}: {
  user: any;
  showValues?: boolean;
  onNewTransaction?: () => void;
  onSeeAll?: () => void;
}) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('6m');
  const [groupBy, setGroupBy] = useState<GroupByMode>('description');
  const [chartTypeFilter, setChartTypeFilter] = useState<TypeFilter>('Despesa');
  const [tableTypeFilter, setTableTypeFilter] = useState<BreakdownTypeFilter>('Todos');
  const [descriptionSearch, setDescriptionSearch] = useState('');
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TransactionItem, 'id'>)
        }));
        setTransactions(items);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar dados do dashboard:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const analytics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const sixMonthsStart = startOfMonth(subMonths(now, 5));
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    const filtered = transactions.filter((t) => {
      const d = parseDueDate(t.dueDate);
      if (!d) return period === 'all';
      if (period === 'month') {
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }
      if (period === '6m') {
        return isWithinInterval(d, { start: sixMonthsStart, end: monthEnd });
      }
      if (period === 'year') {
        return isWithinInterval(d, { start: yearStart, end: yearEnd });
      }
      return true;
    });

    let totalIn = 0;
    let totalOut = 0;
    let paidValue = 0;
    let pendingValue = 0;
    let overdueValue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    // Map for Donut chart (grouped by Description or Category based on toggle)
    const chartGroupMap: Record<string, { label: string; value: number; count: number }> = {};

    // Map for detailed "Separação por Descrição de Lançamento" table
    const descriptionBreakdownMap: Record<
      string,
      {
        key: string;
        description: string;
        type: 'Receita' | 'Despesa';
        category: string;
        count: number;
        totalValue: number;
        paidValue: number;
        openValue: number;
        overdueCount: number;
      }
    > = {};

    // Map for Top Expense Item (KPI 4)
    const topExpenseMap: Record<string, { label: string; value: number }> = {};

    filtered.forEach((t) => {
      const val = Number(t.value) || 0;
      const effStatus = getEffectiveStatus(t);
      const isIncome = t.type === 'Receita';
      const descLabel = normalizeLabel(t.description, 'Sem descrição');
      const catLabel = normalizeLabel(t.category, 'Geral');

      if (isIncome) {
        totalIn += val;
      } else {
        totalOut += val;
        const expRaw = groupBy === 'description' ? descLabel : catLabel;
        const expKey = expRaw.toLowerCase();
        if (!topExpenseMap[expKey]) {
          topExpenseMap[expKey] = { label: expRaw, value: 0 };
        }
        topExpenseMap[expKey].value += val;
      }

      if (effStatus === 'Pago') {
        paidValue += val;
        paidCount += 1;
      } else if (effStatus === 'Atrasado') {
        overdueValue += val;
        overdueCount += 1;
      } else {
        pendingValue += val;
        pendingCount += 1;
      }

      // Donut aggregation
      if (t.type === chartTypeFilter) {
        const rawGroup = groupBy === 'description' ? descLabel : catLabel;
        const groupKey = rawGroup.toLowerCase();
        if (!chartGroupMap[groupKey]) {
          chartGroupMap[groupKey] = { label: rawGroup, value: 0, count: 0 };
        }
        chartGroupMap[groupKey].value += val;
        chartGroupMap[groupKey].count += 1;
      }

      // Description breakdown aggregation (separated by type + normalized description)
      const trxType: 'Receita' | 'Despesa' = isIncome ? 'Receita' : 'Despesa';
      const descKey = `${trxType}::${descLabel.toLowerCase()}`;
      if (!descriptionBreakdownMap[descKey]) {
        descriptionBreakdownMap[descKey] = {
          key: descKey,
          description: descLabel,
          type: trxType,
          category: catLabel,
          count: 0,
          totalValue: 0,
          paidValue: 0,
          openValue: 0,
          overdueCount: 0
        };
      }
      const entry = descriptionBreakdownMap[descKey];
      entry.count += 1;
      entry.totalValue += val;
      if (effStatus === 'Pago') {
        entry.paidValue += val;
      } else {
        entry.openValue += val;
        if (effStatus === 'Atrasado') {
          entry.overdueCount += 1;
        }
      }
    });

    const netBalance = totalIn - totalOut;
    const netMargin = totalIn > 0 ? (netBalance / totalIn) * 100 : 0;
    const totalCount = filtered.length;
    const settlementRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

    const topExpenseEntry = Object.values(topExpenseMap).sort((a, b) => b.value - a.value)[0];

    // Donut slices (top 6 + "Outros" if more exist)
    const sortedGroups = Object.values(chartGroupMap).sort((a, b) => b.value - a.value);
    const totalGroupValue = sortedGroups.reduce((acc, g) => acc + g.value, 0);

    let groupSlices = sortedGroups.slice(0, 6).map((item, idx) => ({
      name: item.label,
      value: item.value,
      count: item.count,
      percent: totalGroupValue > 0 ? (item.value / totalGroupValue) * 100 : 0,
      color: SLICE_COLORS[idx % SLICE_COLORS.length]
    }));

    if (sortedGroups.length > 6) {
      const rest = sortedGroups.slice(6);
      const restVal = rest.reduce((acc, r) => acc + r.value, 0);
      const restCount = rest.reduce((acc, r) => acc + r.count, 0);
      groupSlices.push({
        name: `Outros (${rest.length})`,
        value: restVal,
        count: restCount,
        percent: totalGroupValue > 0 ? (restVal / totalGroupValue) * 100 : 0,
        color: '#52525b'
      });
    }

    const byDescriptionList = Object.values(descriptionBreakdownMap).sort(
      (a, b) => b.totalValue - a.totalValue
    );

    const totalStatusValue = paidValue + pendingValue + overdueValue;

    return {
      filteredCount: totalCount,
      totalIn,
      totalOut,
      netBalance,
      netMargin,
      paidCount,
      pendingCount,
      overdueCount,
      paidValue,
      pendingValue,
      overdueValue,
      totalStatusValue,
      settlementRate,
      topExpenseItem: topExpenseEntry
        ? {
            name: topExpenseEntry.label,
            value: topExpenseEntry.value,
            share: totalOut > 0 ? (topExpenseEntry.value / totalOut) * 100 : 0
          }
        : null,
      groupSlices,
      totalGroupValue,
      byDescriptionList
    };
  }, [transactions, period, groupBy, chartTypeFilter]);

  const filteredDescriptionRows = useMemo(() => {
    const q = descriptionSearch.trim().toLowerCase();
    return analytics.byDescriptionList.filter((row) => {
      const matchesType = tableTypeFilter === 'Todos' || row.type === tableTypeFilter;
      const matchesQuery =
        !q ||
        row.description.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [analytics.byDescriptionList, tableTypeFilter, descriptionSearch]);

  const visibleDescriptionRows = showAllDescriptions
    ? filteredDescriptionRows
    : filteredDescriptionRows.slice(0, 6);

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: 'month', label: 'Mês Atual' },
    { id: '6m', label: '6 Meses' },
    { id: 'year', label: 'Este Ano' },
    { id: 'all', label: 'Tudo' }
  ];

  const blurClass = !showValues ? 'blur-md select-none opacity-25' : 'opacity-100';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-zinc-900 rounded animate-pulse" />
          <div className="h-8 w-64 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card-bg rounded-2xl border border-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card-bg rounded-3xl border border-white/5 animate-pulse" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card-bg rounded-3xl border border-white/5 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-gold">
            <BarChart3 size={16} />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold">
              Dashboard Analítico
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Seus indicadores aparecerão aqui
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Registre sua primeira receita ou despesa para visualizar a evolução mensal do fluxo de caixa, separação por descrição de lançamento e taxa de quitação.
          </p>
        </div>
        {onNewTransaction && (
          <button
            onClick={onNewTransaction}
            className="bg-gold hover:bg-gold-light text-black px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus size={15} />
            Primeiro Lançamento
          </button>
        )}
      </motion.div>
    );
  }

  const activeSliceObj = activeSlice
    ? analytics.groupSlices.find((s) => s.name === activeSlice) || null
    : null;

  // SVG Donut geometry
  const donutSize = 160;
  const strokeWidth = 18;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <section aria-label="Dashboard de Informações Financeiras" className="space-y-6">
      {/* Top Bar: Title + Period Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <BarChart3 size={16} className="text-gold shrink-0" />
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">
            Dashboard de Informações
          </h3>
          <span className="text-zinc-700 text-xs" aria-hidden="true">·</span>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            {analytics.filteredCount} {analytics.filteredCount === 1 ? 'lançamento' : 'lançamentos'}
          </span>
        </div>

        <div
          role="group"
          aria-label="Filtrar período do dashboard"
          className="inline-flex items-center gap-1 p-1 bg-card-bg border border-white/5 rounded-xl self-start sm:self-auto"
        >
          {periodOptions.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPeriod(opt.id);
                  setActiveSlice(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gold text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Consolidated Indicators Strip (4 metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* 1. Resultado Líquido */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card-bg p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">
              Resultado Líquido
            </span>
            {analytics.netBalance >= 0 ? (
              <TrendingUp size={15} className="text-lime-vibrant shrink-0" />
            ) : (
              <TrendingDown size={15} className="text-rose-soft shrink-0" />
            )}
          </div>
          <div>
            <p
              className={`text-lg md:text-2xl font-bold tabular-nums tracking-tight transition-all duration-300 ${
                analytics.netBalance >= 0 ? 'text-white' : 'text-rose-soft'
              } ${blurClass}`}
            >
              {formatBRL(analytics.netBalance)}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
              {analytics.totalIn > 0
                ? `Margem: ${analytics.netMargin.toFixed(1)}%`
                : 'Sem receitas no período'}
            </p>
          </div>
        </motion.div>

        {/* 2. Taxa de Quitação */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card-bg p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">
              Taxa de Quitação
            </span>
            <CheckCircle2 size={15} className="text-gold shrink-0" />
          </div>
          <div>
            <p className="text-lg md:text-2xl font-bold text-white tabular-nums tracking-tight">
              {analytics.settlementRate.toFixed(0)}%
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
              {analytics.paidCount} de {analytics.filteredCount} quitados
            </p>
          </div>
        </motion.div>

        {/* 3. Em Aberto / Atraso */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card-bg p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">
              {analytics.overdueCount > 0 ? 'Em Atraso' : 'A Vencer'}
            </span>
            {analytics.overdueCount > 0 ? (
              <AlertTriangle size={15} className="text-rose-soft shrink-0" />
            ) : (
              <Clock size={15} className="text-[#fbbf24] shrink-0" />
            )}
          </div>
          <div>
            <p
              className={`text-lg md:text-2xl font-bold tabular-nums tracking-tight transition-all duration-300 ${
                analytics.overdueCount > 0 ? 'text-rose-soft' : 'text-[#fbbf24]'
              } ${blurClass}`}
            >
              {formatBRL(
                analytics.overdueCount > 0 ? analytics.overdueValue : analytics.pendingValue
              )}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
              {analytics.overdueCount > 0
                ? `${analytics.overdueCount} vencidos · ${analytics.pendingCount} pendentes`
                : `${analytics.pendingCount} lançamentos pendentes`}
            </p>
          </div>
        </motion.div>

        {/* 4. Maior Despesa (por Descrição ou Categoria) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card-bg p-5 rounded-2xl border border-white/5 flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">
              {groupBy === 'description' ? 'Maior Lançamento' : 'Maior Categoria'}
            </span>
            <Layers size={15} className="text-zinc-400 shrink-0" />
          </div>
          <div>
            <p className="text-lg md:text-xl font-bold text-white truncate tracking-tight">
              {analytics.topExpenseItem ? analytics.topExpenseItem.name : 'Sem despesas'}
            </p>
            <p className={`text-[11px] text-zinc-500 mt-1 tabular-nums transition-all duration-300 ${blurClass}`}>
              {analytics.topExpenseItem
                ? `${formatBRL(analytics.topExpenseItem.value)} · ${analytics.topExpenseItem.share.toFixed(0)}% das saídas`
                : '0% comprometido'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Breakdown Donut by Description (default) or Category + Status Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card-bg rounded-3xl border border-white/5 p-6 flex flex-col justify-between gap-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChartIcon size={15} className="text-gold shrink-0" />
            <h4 className="text-sm font-bold text-white tracking-tight">
              {groupBy === 'description' ? 'Por Descrição' : 'Por Categoria'}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-0.5 p-0.5 bg-dark-bg border border-white/5 rounded-lg">
              {(
                [
                  { id: 'description', label: 'Descrição' },
                  { id: 'category', label: 'Categoria' }
                ] as { id: GroupByMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setGroupBy(mode.id);
                    setActiveSlice(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    groupBy === mode.id
                      ? 'bg-gold text-black'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-0.5 p-0.5 bg-dark-bg border border-white/5 rounded-lg">
              {(['Despesa', 'Receita'] as TypeFilter[]).map((typeOpt) => (
                <button
                  key={typeOpt}
                  type="button"
                  onClick={() => {
                    setChartTypeFilter(typeOpt);
                    setActiveSlice(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartTypeFilter === typeOpt
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {typeOpt === 'Despesa' ? 'Despesas' : 'Receitas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {analytics.groupSlices.length === 0 ? (
          <div className="min-h-[160px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl px-4 text-center">
            <p className="text-xs text-zinc-500">
              Sem {chartTypeFilter === 'Despesa' ? 'despesas' : 'receitas'} registradas neste período.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Interactive SVG Ring */}
            <div className="relative shrink-0" style={{ width: donutSize, height: donutSize }}>
                <svg
                  width={donutSize}
                  height={donutSize}
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="-rotate-90"
                  role="img"
                  aria-label={`Distribuição de ${chartTypeFilter} por ${groupBy === 'description' ? 'descrição' : 'categoria'}`}
                >
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={strokeWidth}
                  />
                  {analytics.groupSlices.reduce(
                    (acc, slice) => {
                      const segmentLength = (slice.percent / 100) * circumference;
                      const dashOffset = -acc.offset;
                      const isDimmed = activeSlice && activeSlice !== slice.name;

                      acc.elements.push(
                        <circle
                          key={slice.name}
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={activeSlice === slice.name ? strokeWidth + 3 : strokeWidth}
                          strokeDasharray={`${Math.max(0, segmentLength - 2)} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-300 cursor-pointer"
                          style={{ opacity: isDimmed ? 0.25 : 1 }}
                          onMouseEnter={() => setActiveSlice(slice.name)}
                          onMouseLeave={() => setActiveSlice(null)}
                        />
                      );

                      acc.offset += segmentLength;
                      return acc;
                    },
                    { offset: 0, elements: [] as React.ReactNode[] }
                  ).elements}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold truncate max-w-[100px]">
                    {activeSliceObj ? activeSliceObj.name : 'Total'}
                  </span>
                  <span className={`text-xs font-bold text-white tabular-nums mt-0.5 ${blurClass}`}>
                    {activeSliceObj
                      ? formatBRL(activeSliceObj.value)
                      : formatBRL(analytics.totalGroupValue)}
                  </span>
                  {activeSliceObj && (
                    <span className="text-[10px] text-gold font-bold tabular-nums">
                      {activeSliceObj.percent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Ranked Slices List */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {analytics.groupSlices.map((slice) => {
                  const isSelected = activeSlice === slice.name;
                  return (
                    <button
                      key={slice.name}
                      type="button"
                      onMouseEnter={() => setActiveSlice(slice.name)}
                      onMouseLeave={() => setActiveSlice(null)}
                      onClick={() =>
                        setActiveSlice(isSelected ? null : slice.name)
                      }
                      className={`w-full text-left space-y-1 p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="text-zinc-200 font-medium truncate">
                            {slice.name}
                          </span>
                          <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">
                            · {slice.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className={`text-zinc-300 font-semibold ${blurClass}`}>
                            {formatBRL(slice.value)}
                          </span>
                          <span className="text-[10px] text-zinc-500 w-9 text-right">
                            {slice.percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${slice.percent}%`,
                            backgroundColor: slice.color
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Health Stacked Bar */}
          <div className="pt-4 border-t border-white/5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 font-medium">Composição por Status</span>
                <span className="text-zinc-400 tabular-nums">
                  {analytics.paidCount} pagos · {analytics.pendingCount} pendentes · {analytics.overdueCount} atrasados
                </span>
              </div>
              {onSeeAll && (
                <button
                  type="button"
                  onClick={onSeeAll}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold hover:text-gold-light transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Ver todos os lançamentos
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden flex">
              {analytics.totalStatusValue > 0 && (
                <>
                  {analytics.paidValue > 0 && (
                    <div
                      title={`Pagos: ${formatBRL(analytics.paidValue)}`}
                      className="h-full bg-lime-vibrant transition-all duration-500"
                      style={{
                        width: `${(analytics.paidValue / analytics.totalStatusValue) * 100}%`
                      }}
                    />
                  )}
                  {analytics.pendingValue > 0 && (
                    <div
                      title={`Pendentes: ${formatBRL(analytics.pendingValue)}`}
                      className="h-full bg-[#fbbf24] transition-all duration-500"
                      style={{
                        width: `${(analytics.pendingValue / analytics.totalStatusValue) * 100}%`
                      }}
                    />
                  )}
                  {analytics.overdueValue > 0 && (
                    <div
                      title={`Atrasados: ${formatBRL(analytics.overdueValue)}`}
                      className="h-full bg-rose-soft transition-all duration-500"
                      style={{
                        width: `${(analytics.overdueValue / analytics.totalStatusValue) * 100}%`
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>

      {/* Breakdown Table Separated by Launch Description */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card-bg rounded-3xl border border-white/5 p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Detalhamento por Descrição de Lançamento
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Consolidado agrupado por descrição · {filteredDescriptionRows.length}{' '}
              {filteredDescriptionRows.length === 1 ? 'descrição' : 'descrições'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-dark-bg border border-white/5 rounded-xl">
              {(['Todos', 'Despesa', 'Receita'] as BreakdownTypeFilter[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTableTypeFilter(opt)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tableTypeFilter === opt
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt === 'Todos' ? 'Todos' : opt === 'Despesa' ? 'Despesas' : 'Receitas'}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={13} />
              <input
                type="text"
                value={descriptionSearch}
                onChange={(e) => setDescriptionSearch(e.target.value)}
                placeholder="Filtrar descrição..."
                aria-label="Filtrar por descrição de lançamento"
                className="w-full bg-dark-bg border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>
        </div>

        {filteredDescriptionRows.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-zinc-500">
              Nenhum lançamento encontrado para este filtro.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Compact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
              {visibleDescriptionRows.map((row) => {
                const denom = row.type === 'Receita' ? analytics.totalIn : analytics.totalOut;
                const share = denom > 0 ? (row.totalValue / denom) * 100 : 0;
                return (
                  <div
                    key={row.key}
                    className="p-4 rounded-2xl border border-white/5 bg-dark-bg/40 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {row.description}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {row.type} · {row.category} · {row.count}x
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums shrink-0 ${
                          row.type === 'Receita' ? 'text-lime-vibrant' : 'text-rose-soft'
                        } ${blurClass}`}
                      >
                        {row.type === 'Receita' ? '+' : '-'} {formatBRL(row.totalValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 tabular-nums pt-2 border-t border-white/5">
                      <span>Pago: <span className={`text-zinc-300 ${blurClass}`}>{formatBRL(row.paidValue)}</span></span>
                      <span>Aberto: <span className={`text-zinc-300 ${blurClass}`}>{formatBRL(row.openValue)}</span></span>
                      <span>{share.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop High-Density Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-2.5 px-3 font-semibold">Descrição</th>
                    <th className="py-2.5 px-3 font-semibold">Tipo</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qtd.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quitado</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Em Aberto</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24">Partic.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {visibleDescriptionRows.map((row) => {
                    const denom = row.type === 'Receita' ? analytics.totalIn : analytics.totalOut;
                    const share = denom > 0 ? (row.totalValue / denom) * 100 : 0;
                    return (
                      <tr
                        key={row.key}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{row.description}</span>
                            <span className="text-[11px] text-zinc-500">
                              {row.category}
                              {row.overdueCount > 0 ? ` · ${row.overdueCount} em atraso` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-medium ${
                              row.type === 'Receita' ? 'text-lime-vibrant' : 'text-rose-soft'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-400 tabular-nums">
                          {row.count}
                        </td>
                        <td className={`py-3 px-3 text-right text-zinc-300 tabular-nums ${blurClass}`}>
                          {formatBRL(row.paidValue)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right tabular-nums ${
                            row.overdueCount > 0
                              ? 'text-rose-soft'
                              : row.openValue > 0
                              ? 'text-[#fbbf24]'
                              : 'text-zinc-600'
                          } ${blurClass}`}
                        >
                          {formatBRL(row.openValue)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-semibold tabular-nums ${
                            row.type === 'Receita' ? 'text-lime-vibrant' : 'text-white'
                          } ${blurClass}`}
                        >
                          {formatBRL(row.totalValue)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.type === 'Receita' ? 'bg-lime-vibrant' : 'bg-gold'
                                }`}
                                style={{ width: `${Math.min(share, 100)}%` }}
                              />
                            </div>
                            <span className="text-zinc-400 w-9 text-right">
                              {share.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredDescriptionRows.length > 6 && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllDescriptions(!showAllDescriptions)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {showAllDescriptions ? (
                    <>
                      <ChevronUp size={14} />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Ver todas as {filteredDescriptionRows.length} descrições
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </section>
  );
}
