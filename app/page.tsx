'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  MessageSquare, 
  LogOut, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertCircle,
  Menu,
  X,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { format, isAfter, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Components
import { FinanceBot } from '@/components/FinanceBot';
import { TransactionsList } from '@/components/TransactionsList';
import { SummaryCards } from '@/components/SummaryCards';
import { TransactionModal } from '@/components/TransactionModal';

export default function Home() {
  const { user, loading, signIn, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'chat'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const handleOpenNewModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-zinc-200"
        >
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">CRM Finanças</h1>
          <p className="text-zinc-500 mb-8">
            Gerencie suas contas, contatos e fluxo de caixa com a ajuda de inteligência artificial.
          </p>
          <button 
            onClick={signIn}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" className="w-5 h-5" alt="Google" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: Receipt },
    { id: 'chat', label: 'CRM Finanças', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row text-[#d1d1d1]">
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        user={user} 
        initialData={editingTransaction}
      />
      {/* Mobile Header */}
      <div className="md:hidden bg-card-bg border-b border-border-dark p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-light tracking-widest uppercase text-white font-serif">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center">
            <Wallet className="text-black w-5 h-5" />
          </div>
          <span>CRM <span className="text-gold font-bold">Finanças</span></span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-600">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 md:relative md:flex md:w-64 flex-col bg-card-bg border-r border-border-dark transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex flex-col mb-8 border-b border-border-dark">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gold rounded flex items-center justify-center">
              <Wallet className="text-black w-6 h-6" />
            </div>
            <span className="font-serif font-light tracking-widest uppercase text-xl text-white">
              CRM <span className="text-gold font-bold">Finanças</span>
            </span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 ml-13">Desenvolvido por Jair</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium transition-all
                  ${activeTab === item.id 
                    ? 'bg-zinc-800 text-gold border-r-2 border-gold' 
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
                `}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-dark">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-10 h-10 rounded border border-border-dark opacity-80" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded text-[10px] uppercase tracking-widest font-bold text-red-400 hover:bg-red-950/30 transition-all"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user} 
                onNewTransaction={handleOpenNewModal} 
                onEditTransaction={handleOpenEditModal} 
              />
            )}
            {activeTab === 'transactions' && (
              <div className="bg-card-bg p-6 rounded border border-border-dark shadow-xl">
                <TransactionsList user={user} onEdit={handleOpenEditModal} />
              </div>
            )}
            {activeTab === 'chat' && <FinanceBot user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components are typically in separate files, but I'll define a basic Dashboard here first to get things running
function Dashboard({ 
  user, 
  onNewTransaction, 
  onEditTransaction 
}: { 
  user: any, 
  onNewTransaction: () => void,
  onEditTransaction: (t: any) => void
}) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-dark pb-6">
        <div>
          <h2 className="text-2xl font-light text-white font-serif">Olá, {user.displayName?.split(' ')[0]}</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">Resumo financeiro consolidado</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onNewTransaction}
            className="bg-gold hover:bg-white text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-gold/10 transition-all"
          >
            <Plus size={16} className="inline mr-1" />
            Novo Lançamento
          </button>
        </div>
      </header>

      <SummaryCards user={user} />

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-card-bg p-6 rounded border border-border-dark shadow-xl">
          <div className="flex items-center justify-between mb-6 border-b border-border-dark pb-4">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Últimas Transações</h3>
            <button className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-gold transition-colors">Ver todas</button>
          </div>
          <TransactionsList user={user} compact onEdit={onEditTransaction} />
        </div>
      </div>
    </div>
  );
}
